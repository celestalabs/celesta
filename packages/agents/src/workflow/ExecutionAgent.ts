import {
  type WorkflowTask,
  type WorkflowTaskResult,
  BaseAgent,
  logger,
} from "@celesta/common";
import type { MessageContext } from "@celesta/session";
import { generateText, stepCountIs, type ToolSet } from "ai";

const log = logger("ExecutionAgent");

type ExecutionAgentConfig = {
  // Configuration options for ExecutionAgent can be added here
  messageContext: MessageContext;
  tools: ToolSet;
  task: WorkflowTask;
  taskResults: WorkflowTaskResult[];
};

export class ExecutionAgent extends BaseAgent {
  private tools: ToolSet;
  private task: WorkflowTask;
  private taskResults: WorkflowTaskResult[];

  constructor({
    messageContext,
    tools,
    task,
    taskResults,
  }: ExecutionAgentConfig) {
    super(messageContext);
    this.task = task;
    this.tools = tools;
    this.taskResults = taskResults;
  }

  async onInitialize(): Promise<WorkflowTaskResult> {
    log(`Starting execution for task: ${this.task.slug}`, [
      this.messageContext.clientId,
      this.messageContext.contextId,
    ]);

    try {
      let contextSection = "";
      if (this.taskResults.length > 0) {
        contextSection = `\n\nPREVIOUS TASKS RESULTS:\n`;
        this.taskResults.forEach((taskData, index) => {
          if (!taskData.success) return; // Skip failed tasks
          contextSection += `${index + 1}. ${taskData.taskSlug}. This task's raw results are accessible via the tool system__getPreviousTaskResults and passing the slug ${taskData.taskSlug}.\n`;
        });
        contextSection += `\nIMPORTANT: If the information needed for your current task was already collected in previous tasks, USE THAT INFORMATION instead of calling tools again. Only use tools if you need NEW information that hasn't been collected yet.\n`;
      }

      // Use streamText for multi-step agentic behavior
      const now = new Date();
      const dateString = now.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const prompt = `Act as an autonomous execution agent responsible for completing the assigned workflow task.
    Current Date: ${dateString}

    Task: ${this.task.description}
    Goal: ${this.task.goal}${contextSection}

    Your objectives:
    - Reason step-by-step to break down the task and determine the best approach for completion.
    - Reference previous task results and context to avoid redundant tool calls.
    - For complex or open-ended tasks, prioritize comprehensiveness and synthesis over speed.

    Tool Usage:
    - You have access to the following tools and their descriptions. Use them to gather new information, perform actions, or retrieve previous results.
    - For each tool call, extract and provide the necessary arguments from context or previous results.
    - Only call tools when their use is justified and required for progress.

    Decision Framework:
    - If performing WRITE operations and information is ambiguous or missing, ask clarifying questions before proceeding.
    - For safe READ operations or when information can be reasonably inferred, act autonomously and gather complete, actionable data sets.
    - Self-correct and iterate if results are incomplete or ambiguous.

    Workflow Steps:
    1. Check if you need data from previous tasks → use system__getPreviousTaskResults("task-slug") for full details.
    2. If you need NEW information, call the appropriate tools with comprehensive parameters.
    3. Make multiple tool calls if needed to gather complete information.
    4. Continue calling tools and analyzing results until you have all the information needed.
    5. After each step, reflect on progress and adapt your plan if necessary.
    6. Generate a concise summary focusing on key insights, analysis, and actionable information (not raw data dumps).

    Output Requirements:
    - Provide a clear, concise summary of what you accomplished.
    - Focus on insights, analysis, and actionable information.
    - Do NOT repeat large amounts of raw data (it's auto-saved).
    - Your response should be short, specific, and to the point.
    `;

      log(prompt);

      const toolCallResults: [string, string][] = [];

      const { text } = await generateText({
        model: this.model,
        tools: this.tools,
        stopWhen: stepCountIs(20), // Limit to 20 steps
        prompt,
        onStepFinish(step) {
          const stepToolResults = step.toolResults
            .filter(
              ({ toolName }) => toolName !== "system__get_previous_task_results"
            )
            .map(
              ({ toolName, input, output }) =>
                [
                  `${toolName}(${JSON.stringify({ input })})`,
                  JSON.stringify({ output }),
                ] as [string, string]
            );

          log("Step completed... Tools", stepToolResults);

          toolCallResults.push(...stepToolResults);
        },
      });

      const outputText = text || "Task completed.";

      const taskResult: WorkflowTaskResult = {
        taskSlug: this.task.slug,
        success: true,
        finalResult: outputText,
        toolCallResults,
      };

      log(
        `Task ${this.task.slug} completed successfully. Output:\n---\n`,
        outputText,
        "\n---\nTool Results:\n",
        taskResult.toolCallResults
      );

      return taskResult;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";

      // Handle other errors normally
      this.sendError(`Task ${this.task.slug} failed: ${errorMsg}`);

      const result: WorkflowTaskResult = {
        taskSlug: this.task.slug,
        success: false,
        error: errorMsg,
      };

      return result;
    }
  }

  async onUserMessage(): Promise<void> {}
}
