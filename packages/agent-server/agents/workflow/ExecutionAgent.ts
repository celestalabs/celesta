import { generateText, stepCountIs, streamText, ToolSet } from "ai";
import { MessageContext } from "../../components/messageContext.js";
import { BaseAgent } from "../BaseAgent.js";
import { WorkflowTask, WorkflowTaskResult } from "@celesta/types";
import { logger } from "../../utils/logger.js";

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

      const prompt = `You are an autonomous execution agent tasked with completing the following:

Current Date: ${dateString}

Task: ${this.task.description}
Goal: ${this.task.goal}${contextSection}

You have access to various tools to help complete this task.

ACCESSING DATA FROM PREVIOUS TASKS:
- The task slug is shown in the "PREVIOUS TASKS" section above (e.g., "search-interview-emails")
- This gives you the FULL RAW tool outputs (e.g., all 200 email IDs, complete responses)

DATA PERSISTENCE:
- All your tool call results are AUTOMATICALLY saved and will be available to future tasks
- You do NOT need to repeat data in your final output - just summarize key findings
- Future tasks can retrieve your raw tool data using system__getPreviousTaskResults
- Focus your response on analysis and insights, not regurgitating raw data

DECISION FRAMEWORK FOR CLARIFYING QUESTIONS:

ASK QUESTIONS (using askQuestion tool) when:
- Performing WRITE operations with missing critical information:
* Sending emails and recipient is unclear ("my colleague", "my boss")
* Creating/modifying calendar events with ambiguous details
* Deleting or modifying data where the target is unclear
* Any irreversible action that could cause problems if done incorrectly
- The task is genuinely ambiguous and assumptions could lead to wrong results

BE AUTONOMOUS (no questions) when:
- Performing READ operations:
* Checking calendars → check ALL available calendars
* Getting emails → retrieve sufficient emails (e.g., last 20-50)
* Finding contacts → search across all available sources
* Gathering information → collect complete, actionable data sets
- Information can be reasonably inferred from context
- The operation is safe and can be easily corrected

General principle: "Better to ask one question than to send the wrong email"

CRITICAL WORKFLOW:
1. Check if you need data from previous tasks → use system__getPreviousTaskResults("task-slug") to get full details
2. If you need NEW information, call the appropriate tools WITH COMPREHENSIVE PARAMETERS
3. Make multiple tool calls if needed to gather complete information
4. Continue calling tools and analyzing results until you have all the information needed
5. Generate a concise summary focusing on KEY INSIGHTS, not raw data dumps

YOUR RESPONSE FORMAT:
- Provide a clear, concise summary of what you accomplished
- Focus on insights, analysis, and actionable information
- Do NOT repeat large amounts of raw data (it's auto-saved)
- Your response should be SHORT and to the point`;

      log(prompt);

      const toolCallResults: [string, string][] = [];

      const { text } = await generateText({
        model: this.model,
        tools: this.tools,
        stopWhen: stepCountIs(20), // Limit to 20 steps
        prompt,
        onStepFinish(step) {
          const stepToolResults = step.toolResults.map(
            ({ toolName, output }) =>
              [toolName, JSON.stringify({ output })] as [string, string]
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
