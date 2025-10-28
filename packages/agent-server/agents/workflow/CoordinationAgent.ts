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
import { WorkflowStatus, WorkflowTask } from "@celesta/types";

type CoordinationAgentConfig = {
  prompt: string;
  messageContext: MessageContext;
};

const NextTaskSchema = z.discriminatedUnion("shouldContinue", [
  z.object({
    shouldContinue: z.literal(true),
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
      })
      .describe("The next task to execute, if shouldContinue is true"),
    selectedTools: z
      .array(
        z.object({
          toolId: z.string().describe("The ID of the selected tool"),
          reason: z.string().describe("Why this tool is relevant for the task"),
        })
      )
      .describe("List of selected tools with reasoning"),
  }),
  z.object({
    shouldContinue: z.literal(false),
    reasoning: z
      .string()
      .describe("Reasoning for the decision to continue or stop"),
    task: z
      .undefined()
      .optional()
      .describe("No task if shouldContinue is false"),
  }),
]);

export class CoordinationAgent extends BaseAgent {
  private prompt: string;
  private tools: ToolSet;
  private toolMetadata: ToolMetadata[];
  private workflowStatus: WorkflowStatus = "running";
  private upcomingTaskQueue: WorkflowTask[] = [];
  private processedTasks: WorkflowTask[] = [];

  constructor({ prompt, messageContext }: CoordinationAgentConfig) {
    super(messageContext);
    this.prompt = prompt;
    this.tools = gatherTools(messageContext, "workflow");
    this.toolMetadata = getMetadataFromToolSet(this.tools);

    this.startAgentLoop();
  }

  async startAgentLoop() {
    try {
      while (this.workflowStatus === "running") {
        await this.launchNewTask();
        while (this.upcomingTaskQueue.length > 0) {
          const currentTask = this.upcomingTaskQueue.shift()!;
          this.processedTasks.push(currentTask);
          await this.executeTask(currentTask);
        }
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
  getDetailedContext(): string {
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
  async launchNewTask() {
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

    if (response.shouldContinue === false) {
      this.workflowStatus = "completed";
      return;
    }

    this.upcomingTaskQueue.push({
      slug: response.task.slug,
      description: response.task.description,
      goal: response.task.goal,
      tools: response.selectedTools
        .map((t) => t.toolId)
        .filter((toolId) => toolId in this.tools),
      status: "pending",
    });
  }

  async executeTask(task: WorkflowTask) {
    task.status = "in-progress";
    this.processedTasks.push(task);
  }

  // stub we dont rly need this
  onUserMessage(): Promise<void> {
    return Promise.resolve();
  }
}
