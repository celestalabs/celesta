import { streamText, stepCountIs, ToolSet } from "ai";
import { BaseAgent, BaseAgentConfig } from "./BaseAgent.js";
import { Task, TaskResult } from "../types/types.js";
/**
 * ExecutionAgent executes tasks using the selected tools.
 * It automatically updates the execution context with results.
 */
export class ExecutionAgent extends BaseAgent {
  protected agentName = "ExecutionAgent";

  constructor(config: BaseAgentConfig) {
    super(config);
  }

  /**
   * Execute a task using the provided tools
   */
  async run({
    task,
    tools,
  }: {
    task: Task;
    tools: ToolSet;
  }): Promise<TaskResult> {
    this.sendStatus(`Executing task: ${task.description}`);

    // Update task status
    this.executionContext.updateTaskStatus(task.id, "in-progress");

    try {
      const toolsList = Object.keys(tools).join(", ");
      this.sendInfo(`Using tools: ${toolsList}`);

      // Get previous task data for context-aware execution
      const previousTaskData = this.getPreviousTaskData();
      let contextSection = "";

      if (previousTaskData.length > 0) {
        contextSection = `\n\nPREVIOUS TASKS AND THEIR RESULTS:\n`;
        previousTaskData.forEach((taskData, index) => {
          contextSection += `${index + 1}. ${taskData.taskDescription}\n`;
          if (taskData.output) {
            contextSection += `   Result: ${taskData.output}\n`;
          }
          if (taskData.data?.toolResults) {
            contextSection += `   Raw Data: ${JSON.stringify(taskData.data.toolResults, null, 2)}\n`;
          }
        });
        contextSection += `\nIMPORTANT: If the information needed for your current task was already collected in previous tasks, USE THAT INFORMATION instead of calling tools again. Only use tools if you need NEW information that hasn't been collected yet.\n`;
      }

      // Use streamText for multi-step agentic behavior
      const streamResult = streamText({
        model: this.model,
        tools,
        stopWhen: stepCountIs(10), // Limit to 7 steps to avoid long runs
        onStepFinish: ({ text, toolCalls }) => {
          if (toolCalls && toolCalls.length > 0) {
            this.sendInfo(
              `Step completed with ${toolCalls.length} tool call(s)`
            );
          }
        },
        prompt: `You are an autonomous execution agent tasked with completing the following:

Task: ${task.description}
Goal: ${task.goal}${contextSection}

You have access to various tools to help complete this task.

AUTONOMY PRINCIPLES:
- Make intelligent assumptions to provide the MOST USEFUL and COMPLETE results
- When scope is unclear, default to being COMPREHENSIVE rather than minimal
- Examples of autonomous behavior:
  * Checking calendars → check ALL available calendars
  * Getting emails → retrieve sufficient emails to provide meaningful insights (e.g., last 20-50)
  * Finding contacts → search across all available sources
  * Gathering information → collect complete, actionable data sets
- DO NOT ask clarifying questions - make reasonable assumptions instead
- Call tools with parameters that maximize utility (e.g., reasonable page sizes, comprehensive queries)
- If multiple related items exist, retrieve all of them unless it would be excessive (100+ items)

CRITICAL WORKFLOW:
1. First, check if previous tasks already collected the information you need
2. If the data already exists in the context above, summarize and work with it - DO NOT call tools again
3. If you need NEW information not in the context, call the appropriate tools WITH COMPREHENSIVE PARAMETERS
4. Make multiple tool calls if needed to gather complete information
5. Continue calling tools and analyzing results until you have all the information needed
6. After gathering all data, generate a comprehensive natural language summary

YOUR RESPONSE FORMAT:
- If you call tools, analyze each result as you go
- Once you have all information, provide a detailed final summary
- Include specific details from the tool results (names, dates, numbers, etc.)
- Your text response is the PRIMARY OUTPUT that will be shown to the user
- NEVER leave your response empty - always provide a detailed summary

MANDATORY: You MUST generate a detailed text response explaining your findings. Empty responses are not acceptable.`,
      });

      // Consume the stream to get final results
      let fullText = "";
      for await (const chunk of streamResult.textStream) {
        fullText += chunk;
      }

      // Await all the promises
      const toolCalls = await streamResult.toolCalls;
      const toolResults = await streamResult.toolResults;

      // Log execution details
      if (toolCalls && toolCalls.length > 0) {
        this.sendInfo(`Made ${toolCalls.length} total tool call(s)`);
      }

      // Extract raw tool data for better accessibility
      const rawToolData: Record<string, any> = {};
      toolResults?.forEach((tr: any) => {
        if ("result" in tr) {
          rawToolData[tr.toolName] = tr.result;
        }
      });

      // Fallback: if text is empty but we have tool results, generate a summary
      let outputText = fullText;
      if (
        (!fullText || fullText.trim() === "") &&
        toolResults &&
        toolResults.length > 0
      ) {
        this.sendInfo(
          "Model didn't generate text output, creating summary from tool results"
        );

        outputText = `Task completed. Retrieved data using ${toolResults.length} tool(s):\n`;
        toolResults.forEach((tr: any) => {
          if ("result" in tr) {
            outputText += `\n${tr.toolName}: ${JSON.stringify(tr.result, null, 2)}`;
          }
        });
      }

      const taskResult: TaskResult = {
        taskId: task.id,
        success: true,
        output: outputText,
        data: {
          toolCalls: toolCalls?.map((tc: any) => ({
            toolName: tc.toolName,
            args: "args" in tc ? tc.args : undefined,
          })),
          toolResults: toolResults?.map((tr: any) => ({
            toolName: tr.toolName,
            result: "result" in tr ? tr.result : undefined,
          })),
          rawToolData, // Easily accessible tool data
        },
        completedAt: new Date(),
      };

      // Update execution context
      this.executionContext.updateWithResult(task, taskResult);

      this.sendStatus(`Task completed: ${task.description}`);

      return taskResult;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";

      this.sendError(`Task failed: ${errorMsg}`);

      const result: TaskResult = {
        taskId: task.id,
        success: false,
        output: "",
        error: errorMsg,
        completedAt: new Date(),
      };

      // Update execution context with failure
      this.executionContext.updateWithResult(task, result);

      return result;
    }
  }
}
