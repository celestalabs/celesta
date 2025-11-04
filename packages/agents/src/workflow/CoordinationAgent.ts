import {
  ts,
  type WorkflowId,
  type WorkflowStatus,
  type WorkflowTask,
  type WorkflowTaskResult,
  BaseAgent,
  type WorkflowTaskStatus,
  logger,
} from "@celesta/common";
import type { MessageContext } from "@celesta/session";
import { generateObject, tool, type ToolSet } from "ai";
import z from "zod";
import {
  formatToolMetadataForPrompt,
  getMetadataFromToolSet,
  type ToolMetadata,
} from "../utils/toolMetadata.js";
import { toolStore } from "../utils/toolStore.js";
import { ExecutionAgent } from "./ExecutionAgent.js";
import { SynthesisAgent } from "./SynthesisAgent.js";

const log = logger("CoordinationAgent");

type CoordinationAgentConfig = {
  prompt: string;
  messageContext: MessageContext;
};

const NextTaskSchema = z.discriminatedUnion("shouldContinue", [
  z.object({
    shouldContinue: z.literal("continue"),
    reasoning: z
      .string()
      .describe("Reasoning for the decision to continue or stop"),
    task: z
      .object({
        slug: z
          .string()
          .describe(
            "Short semantic identifier for this task (e.g., 'email-query-1', 'calendar-check-1'). Use lowercase with hyphens."
          ),
        description: z.string().describe("Clear description of the task"),
        goal: z.string().describe("What this task aims to achieve"),
        tools: z
          .array(z.string())
          .describe("List of tool names to use for this task"),
      })
      .describe("The next task to execute, if shouldContinue is 'continue'"),
  }),
  z.object({
    shouldContinue: z.literal("stop"),
    reasoning: z
      .string()
      .describe("Reasoning for the decision to continue or stop"),
  }),
]);

const createInstructions = (
  detailedContextSummary: string,
  dateString: string,
  formattedToolMetadata: string
) => `## 1. Identity and Role

You are the **Coordination Agent**, the 'planner' in a three-agent autonomous workflow. You are a non-conversational, backend-only agent. Your sole purpose is to plan the *next single step* for your teammate, the **Execution Agent**.

  * **Your Teammates:**
    1.  **The Execution Agent (your 'Doer'):** Receives your JSON plan and runs it.
    2.  **The Synthesis Agent (the 'Finisher'):** Receives the final result *after* you are finished.
  * **Your Role:** You are the "brain," deciding *what* to do next.
  * **Your Communication:** You **DO NOT** speak to the user. You **ONLY** speak to the Execution Agent, and your *only* output is a single, minified JSON object.

-----

## 2. Workflow Context

You will always be given the most up-to-date context:

  * **Current Date:** ${dateString}
  * **Available Tools:** ${formattedToolMetadata}
  * **Workflow History:** (This includes the main goal, your previous plan, and the result from the Execution Agent)
    ${detailedContextSummary}

-----

## 3\. Operational Mandate & Rules

Your one and only job is to analyze the Workflow History and output a JSON object for the Execution Agent. Follow these rules strictly.

**A. Trust the Context. Do Not Micromanage.**
The Execution Agent has access to the *exact same* WorkflowHistory as you.

  * **DO NOT** create tasks like "retrieve information from the previous step" or "look at the data we just gathered." That data is already in the WorkflowHistory.
  * **DO** create the *next logical action* that *uses* that information.
  * **Example:**
      * **BAD TASK:** The last step was \`task.description: "Search for 'XYZ stock price'"\`. Your new task is \`task.description: "Retrieve the stock price from the previous step."\`
      * **GOOD TASK:** The last step was \`task.description: "Search for 'XYZ stock price'"\`. Your new task is \`task.description: "Analyze the retrieved stock price data and determine the 30-day average."\`

**B. Know Your Role. Do Not Synthesize.**
The Synthesis Agent is responsible for creating the *final* answer.

  * **DO NOT** create tasks for the Execution Agent that *only* synthesize or present a final answer (e.g., \`task.description: "Summarize all findings and present the report."\`).
  * **EXCEPTION:** You *may* ask the Execution Agent to perform an *intermediate* synthesis (e.g., "generate a draft report") **ONLY IF** that output is needed as *input* for a *subsequent* Execution task (e.g., \`task.description: "Generate a report on XYZ, then... task.description: "Email that report to manager@example.com"\`).

**C. Determine Workflow Completion.**

  * Review the \`WorkflowHistory\` and the main goal.
  * If the main goal is **NOT** fully achieved, you *must* set \`shouldContinue: "continue"\` and define the next \`task\` object.
  * If the main goal **IS** fully achieved, you *must* set \`shouldContinue: "stop"\`. The system will automatically hand off the complete \`WorkflowHistory\` to the Synthesis Agent.

-----

## 4\. Output Format

Your **ONLY** output must be a single, minified JSON object that strictly adheres to the following structure. Do not provide *any* conversational text, preamble, or explanations outside of the JSON.

### **If the workflow must continue:**

Output this JSON structure:

\`\`\`json
{
  "shouldContinue": "continue",
  "reasoning": "Reasoning for why the workflow must continue with this new task.",
  "task": {
    "slug": "short-semantic-identifier-for-this-task",
    "description": "A clear and specific description of the single task for the Execution Agent.",
    "goal": "A brief statement of what this specific task aims to achieve.",
    "tools": ["tool_name_1", "tool_name_2"]
  }
}
\`\`\`

### **If the workflow is complete:**

Output this JSON structure:

\`\`\`json
{
  "shouldContinue": "stop",
  "reasoning": "Reasoning for why the main goal is now considered complete and the workflow can stop."
}
\`\`\``;

export class CoordinationAgent extends BaseAgent {
  private prompt: string;
  private tools: ToolSet = {};
  private toolMetadata: ToolMetadata[] = [];
  private _workflowStatus: WorkflowStatus = "running";
  private upcomingTaskQueue: WorkflowTask[] = [];
  private processedTasks: WorkflowTask[] = [];
  private processedTaskResults: WorkflowTaskResult[] = [];

  constructor({ prompt, messageContext }: CoordinationAgentConfig) {
    log("Hello", prompt);
    super(messageContext);
    this.prompt = prompt;

    // TODO: super chopped conversion from mastra tool to ai sdk tool for compat
    // DELETE when convert to mastra
    const mastraTools = toolStore.getTools(messageContext, "workflow") ?? {};

    for (const [toolName, toolInstance] of Object.entries(mastraTools)) {
      this.tools[toolName] = tool({
        description: toolInstance.description,
        inputSchema: toolInstance.inputSchema,
        execute: (input) => toolInstance.execute?.({ context: input } as any),
      });
    }

    this.tools["system__ask_user_question"] = tool({
      description:
        "Ask the user a question, to clarify uncertainties or doubts.",
      inputSchema: z.object({
        question: z.string().describe("The question to ask the user."),
      }),
      execute: async (input) => {
        try {
          const { question } = input;
          const answer =
            await this.messageContext.retrieveQuestionResponse(question);
          return answer;
        } catch (error) {
          return "The user didn't respond in time. " + error;
        }
      },
    });

    this.tools["system__get_previous_task_results"] = tool({
      description:
        "Retrieve data and tool call output from a previously executed task.",
      inputSchema: z.object({
        taskSlug: z
          .string()
          .describe(
            "The slug identifier of the task whose data is to be retrieved."
          ),
      }),
      execute: (input) => {
        log("Getting previous task results for slug:", input.taskSlug);
        const { taskSlug } = input;
        const taskResult = this.processedTaskResults.find(
          (result) => result.taskSlug === taskSlug
        );
        if (taskResult) {
          return taskResult;
        } else {
          return `No data found for task with slug: ${taskSlug}`;
        }
      },
    });
  }

  private get workflowStatus() {
    return this._workflowStatus;
  }

  // supplying no status implies new task creation, set to pending
  private createOrUpdateTask(
    task: WorkflowTask,
    status: WorkflowTaskStatus = "pending"
  ) {
    task.status = status;
    this.messageContext.generalSendMessage(
      ts({
        type: "WORKFLOW_TASK_STATUS_CHANGED",
        workflowId: this.messageContext.contextId as WorkflowId,
        slug: task.slug,
        ...(status === "pending"
          ? {
              status,
              description: task.description,
            }
          : {
              status,
            }),
      })
    );
  }

  private set workflowStatus(status: WorkflowStatus) {
    this._workflowStatus = status;
    this.messageContext.generalSendMessage(
      ts({
        type: "WORKFLOW_STATUS_CHANGED",
        workflowId: this.messageContext.contextId as WorkflowId,
        ...(status === "running"
          ? {
              status,
              prompt: this.prompt,
            }
          : { status }),
      })
    );
  }

  async onInitialize() {
    log("Hello on initialize", this.prompt);

    this.toolMetadata = getMetadataFromToolSet(this.tools);

    log("Starting workflow loop for task", this.prompt, [
      this.messageContext.clientId,
      this.messageContext.contextId,
    ]);

    try {
      while (this.workflowStatus === "running") {
        await this.launchNewTask();

        // Execution loop
        while (this.upcomingTaskQueue.length > 0) {
          log("Processed Tasks:", this.processedTasks);
          log("Processed Task Results:", this.processedTaskResults);
          log("Upcoming Task Queue:", this.upcomingTaskQueue);
          const currentTask = this.upcomingTaskQueue.shift()!;
          this.processedTasks.push(currentTask);
          await this.executeTask(currentTask);
        }
      }

      // Synthesize into results
      await this.synthesizeResults();
    } catch (error) {
      log(error);
      this.sendError(
        `Workflow failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      this.workflowStatus = "failed";
    }
  }

  /**
   * Produces LLM content summarizing current context including data
   * from completed tasks.
   */
  private getDetailedContext(): string {
    let context = `Original Prompt: ${this.prompt}\n\n`;

    context += `Progress: ${this.processedTasks.length} tasks processed\n\n`;

    if (this.processedTasks.length > 0) {
      context += `Completed Tasks:\n`;
      this.processedTasks.forEach((task, index) => {
        context += `${index + 1}. [${task.slug || "unknown"}] ${
          task.description
        }\n`;
        context += `   Goal: ${task.goal}\n`;
      });
    } else {
      context += "No tasks have been completed yet.\n\n";
    }

    return context;
  }

  /**
   * Determine the next task to execute based on current context
   */
  private async launchNewTask() {
    const detailedContextSummary = this.getDetailedContext();
    const now = new Date();
    const dateString = now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const prompt = createInstructions(
      detailedContextSummary,
      dateString,
      formatToolMetadataForPrompt(this.toolMetadata)
    );

    const { object: response } = await generateObject({
      model: this.model,
      schema: NextTaskSchema,
      prompt,
    });

    // Don't add tasks, nothing to add since we're done!
    if (response.shouldContinue === "stop") {
      this.workflowStatus = "finishing";
      return;
    }

    const task = {
      slug: response.task.slug,
      description: response.task.description,
      goal: response.task.goal,
      tools: response.task.tools.filter((toolId) => toolId in this.tools),
      status: "pending",
    } as const satisfies WorkflowTask;

    this.createOrUpdateTask(task);
    this.upcomingTaskQueue.push(task);
  }

  /**
   * Synthesize results from completed tasks
   */
  private async synthesizeResults() {
    log("Synthesizing workflow results", [
      this.messageContext.clientId,
      this.messageContext.contextId,
    ]);

    const synthesisAgent = new SynthesisAgent({
      prompt: this.prompt,
      messageContext: this.messageContext,
      processedTaskResults: this.processedTaskResults,
      tools: {
        system__get_previous_task_results:
          this.tools["system__get_previous_task_results"],
      },
    });

    await synthesisAgent.onInitialize();
    this.workflowStatus = "completed";
  }

  private async executeTask(task: WorkflowTask) {
    log("Executing task", task.slug, [
      this.messageContext.clientId,
      this.messageContext.contextId,
    ]);

    this.createOrUpdateTask(task, "running");

    this.processedTasks.push(task);

    const executionAgent = new ExecutionAgent({
      messageContext: this.messageContext,
      tools: this.tools,
      task,
      taskResults: this.processedTaskResults,
    });

    const result = await executionAgent.onInitialize();
    this.processedTaskResults.push(result);

    if (result.success) {
      this.createOrUpdateTask(task, "completed");
    } else {
      this.createOrUpdateTask(task, "failed");
      this.sendError(
        `*Task \`${task.slug}\` failed.*\n\n${result.error || "Unknown error"}`
      );
    }
  }

  // stub we dont rly need this
  async onUserMessage() {}
}
