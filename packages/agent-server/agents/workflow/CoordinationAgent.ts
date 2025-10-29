import { generateObject, ToolSet } from "ai";
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
    this.tools = gatherTools(messageContext, "workflow");
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
          const currentTask = this.upcomingTaskQueue.shift()!;
          this.processedTasks.push(currentTask);
          await this.executeTask(currentTask);
        }

        // Synthesize into results
        await this.synthesizeResults();
      }
    } catch (error) {
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
      prompt: `You are an autonomous coordination agent that breaks down complex tasks and makes intelligent decisions.

Current Date: ${dateString}

Current Context:
${detailedContextSummary}

${formatToolMetadataForPrompt(this.toolMetadata)}

Your job is to:
1. Analyze the original prompt and what has been done so far
2. Review what DATA and INFORMATION has already been collected
3. Determine if more tasks are needed to complete the request
4. If yes, define the next specific task to execute
5. If no, signal that execution should complete

For the task (if one is needed), provide a list of tool names (as strings) that could be used to accomplish the task. Select tools that are relevant and provide reasoning for each choice. If no tools are needed, return an empty array. Use the available tool registry and metadata above for your selection. 

IMPORTANT: Synthesis/compilation will NOT occur at this step and should NOT be triggered as a task here. Synthesis is handled in a separate step after all data collection and execution tasks are complete.

WHEN TO ASK CLARIFYING QUESTIONS:
Ask questions for RISKY WRITE OPERATIONS when critical information is missing:
- Sending emails: Ask for recipient if unclear ("my colleague" → ask which one)
- Creating/modifying calendar events: Ask for details if ambiguous
- Deleting or modifying data: Confirm if there's risk of data loss
- Financial transactions or important decisions: Clarify before acting
- Any operation that cannot be easily undone

When to mention doubts related to the task:
- If the user says "send to my colleague" but you don't know who → create a clarification task
- If creating an event without clear date/time → identify the ambiguity
- If modifying data and the target is unclear → note what needs clarification

BE AUTONOMOUS FOR SAFE READ OPERATIONS:
- Reading calendars: Check ALL calendars without asking
- Reading emails: Retrieve comprehensive data without asking which folder
- Searching information: Gather complete results
- Listing/viewing data: Default to comprehensive rather than minimal

General principle: "Ask before writing/modifying, be autonomous when reading"

IMPORTANT RULES:
- DO NOT create tasks to retrieve information that has already been collected
- Each data retrieval task should be something that can be executed using the available tools listed above

Be specific and actionable in task descriptions.

If all necessary tasks have been completed, set shouldContinue to false.`,
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
      task.tools.map((toolName) => [toolName, this.tools[toolName]])
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
