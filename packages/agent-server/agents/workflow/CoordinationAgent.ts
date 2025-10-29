import { generateObject, tool, ToolSet } from "ai";
import { MessageContext } from "../../components/messageContext.js";
import { BaseAgent } from "../BaseAgent.js";
import z from "zod";
import { gatherTools } from "../../utils/gatherTools.js";
import {
  formatToolMetadataForPrompt,
  getMetadataFromToolSet,
  ToolMetadata,
} from "../../utils/toolMetadata.js";
import {
  WorkflowId,
  WorkflowStatus,
  WorkflowTask,
  WorkflowTaskResult,
} from "@celesta/types";
import { ExecutionAgent } from "./ExecutionAgent.js";
import { logger } from "../../utils/logger.js";
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

export class CoordinationAgent extends BaseAgent {
  private prompt: string;
  private tools: ToolSet;
  private toolMetadata: ToolMetadata[];
  private _workflowStatus: WorkflowStatus = "running";
  private upcomingTaskQueue: WorkflowTask[] = [];
  private processedTasks: WorkflowTask[] = [];
  private processedTaskResults: WorkflowTaskResult[] = [];

  constructor({ prompt, messageContext }: CoordinationAgentConfig) {
    super(messageContext);
    this.prompt = prompt;
    this.tools = gatherTools(messageContext, "workflow", {
      ask_user_question: tool({
        description:
          "Ask the user a question, to clarify uncertainties or doubts.",
        inputSchema: z.object({
          question: z.string().describe("The question to ask the user."),
        }),
        execute: async (input) => {
          try {
            const { question } = input;
            const answer =
              await messageContext.retrieveQuestionResponse(question);
            return answer;
          } catch (error) {
            return "The user didn't respond in time.";
          }
        },
      }),
      get_previous_task_results: tool({
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
      }),
    });
    this.toolMetadata = getMetadataFromToolSet(this.tools);
  }

  private get workflowStatus() {
    return this._workflowStatus;
  }

  private set workflowStatus(status: WorkflowStatus) {
    this._workflowStatus = status;
    this.messageContext.generalSendMessage({
      type: "WORKFLOW_STATUS_CHANGED",
      workflowId: this.messageContext.contextId as WorkflowId,
      ...(status === "running"
        ? {
            status,
            prompt: this.prompt,
          }
        : { status }),
    });
  }

  async onInitialize() {
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

    const { object: response } = await generateObject({
      model: this.model,
      schema: NextTaskSchema,
      prompt: `Act as a workflow coordination agent for autonomous, multi-step processes.
Current Date: ${dateString}
Context:
${detailedContextSummary}
${formatToolMetadataForPrompt(this.toolMetadata)}

Your objectives:
- Set and maintain a clear high-level goal for the workflow.
- Decompose the main goal into actionable sub-tasks, reasoning step-by-step and reflecting on progress after each step.
- For each decision, provide explicit reasoning and reference relevant context.

Tool Calling:
- You have access to the following tools and their descriptions. Use them to accomplish tasks, retrieve information, or interact with external systems.
- For each tool call, extract and provide the necessary arguments from the user context or previous results.
- Only call tools when their use is justified and required for progress.

Agentic Workflow:
- After each sub-task, self-evaluate progress and adapt your plan if needed. If the workflow is open-ended or research-focused, prioritize comprehensiveness and synthesis over speed.
- For workflows with a clear, binary goal, end as soon as the goal is achieved.
- Maintain and reference relevant context across all steps and tool calls.
- If you identify gaps or ambiguities, ask clarifying questions before proceeding with risky or irreversible actions.

Output Requirements:
- For each new task, provide: (1) explicit reasoning, (2) the next actionable task, (3) relevant tool names, and (4) a stop signal if the workflow is complete.
- Be specific, actionable, and justify all decisions.

Rules:
- Do not create tasks to retrieve information already collected.
- Each data retrieval task should use available tools.
- Be specific and actionable.

If all necessary tasks are complete, set shouldContinue to false.`,
    });

    // Don't add tasks, nothing to add since we're done!
    if (response.shouldContinue === "stop") {
      this.workflowStatus = "finishing";
      return;
    }

    this.upcomingTaskQueue.push({
      slug: response.task.slug,
      description: response.task.description,
      goal: response.task.goal,
      tools: response.task.tools.filter((toolId) => toolId in this.tools),
      status: "pending",
    });
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

    const finalResult = await synthesisAgent.onInitialize();

    this.sendFinal(finalResult);

    this.workflowStatus = "completed";
  }

  private async executeTask(task: WorkflowTask) {
    log("Executing task", task.slug, [
      this.messageContext.clientId,
      this.messageContext.contextId,
    ]);

    task.status = "running";
    this.processedTasks.push(task);

    const tools: ToolSet = Object.fromEntries(
      [
        ...task.tools,
        "system__get_previous_task_results",
        "system__ask_user_question",
      ].map((toolName) => [toolName, this.tools[toolName]])
    );

    const executionAgent = new ExecutionAgent({
      messageContext: this.messageContext,
      tools,
      task,
      taskResults: this.processedTaskResults,
    });

    const result = await executionAgent.onInitialize();
    this.processedTaskResults.push(result);

    if (result.success) {
      task.status = "completed";
      this.sendChat(
        `Task [${task.slug}] completed successfully.\n\n${result.finalResult}`
      );
    } else {
      task.status = "failed";
      this.sendError(
        `Task [${task.slug}] failed: ${result.error || "Unknown error"}`
      );
    }
  }

  // stub we dont rly need this
  async onUserMessage() {}
}
