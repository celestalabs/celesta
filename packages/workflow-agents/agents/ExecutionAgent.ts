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
    if (!this.executionContext) {
      throw new Error("ExecutionAgent requires an ExecutionContext");
    }
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
    this.executionContext!.updateTaskStatus(task.id, "in-progress");

    // Wrap all tools to automatically collect their results for DataRegistry
    // Exclude system__ tools to avoid recursion (they retrieve data, don't generate it)
    const toolCallResults: Array<{ toolName: string; result: any }> = [];
    const wrappedTools: ToolSet = {};

    for (const [toolName, tool] of Object.entries(tools)) {
      if (tool.execute === undefined) {
        // Skip non-executable tools (e.g., static data tools)
        wrappedTools[toolName] = tool;
        continue;
      }

      // Check if this is the getTaskData tool (retrieval only, not new data)
      const isRetrievalTool = toolName === "system__getTaskData";

      wrappedTools[toolName] = {
        ...tool,
        execute: async (args: any, options: any) => {
          const result = await tool.execute?.(args, options);

          // Only capture non-retrieval tool results to avoid recursion
          // system__getTaskData retrieves existing data, not new data
          // system__askQuestion generates NEW data (user's answer) so we DO capture it
          if (!isRetrievalTool) {
            toolCallResults.push({ toolName, result });
          }

          return result;
        },
      };
    }

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
      const now = new Date();
      const dateString = now.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const streamResult = streamText({
        model: this.model,
        tools: wrappedTools, // Use wrapped tools that capture results
        stopWhen: stepCountIs(10), // Limit to 10 steps to avoid long runs
        prompt: `You are an autonomous execution agent tasked with completing the following:

Current Date: ${dateString}

Task: ${task.description}
Goal: ${task.goal}${contextSection}

You have access to various tools to help complete this task.

ACCESSING DATA FROM PREVIOUS TASKS:
- Use system__getTaskData(taskIdentifier: "task-slug-name") to retrieve detailed data from completed tasks
- The task slug is shown in the "PREVIOUS TASKS" section above (e.g., "search-interview-emails")
- This gives you the FULL RAW tool outputs (e.g., all 200 email IDs, complete responses)
- The "Result" shown above is just a summary - use system__getTaskData for complete data

DATA PERSISTENCE:
- All your tool call results are AUTOMATICALLY saved and will be available to future tasks
- You do NOT need to repeat data in your final output - just summarize key findings
- Future tasks can retrieve your raw tool data using system__getTaskData
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
1. Check if you need data from previous tasks → use system__getTaskData("task-slug") to get full details
2. If you need NEW information, call the appropriate tools WITH COMPREHENSIVE PARAMETERS
3. Make multiple tool calls if needed to gather complete information
4. Continue calling tools and analyzing results until you have all the information needed
5. Generate a concise summary focusing on KEY INSIGHTS, not raw data dumps

YOUR RESPONSE FORMAT:
- Provide a clear, concise summary of what you accomplished
- Focus on insights, analysis, and actionable information
- Do NOT repeat large amounts of raw data (it's auto-saved)
- Your response should be SHORT and to the point
- Empty responses are acceptable if tools speak for themselves`,
      });

      // Consume the stream to get final results
      let fullText = "";
      for await (const chunk of streamResult.textStream) {
        fullText += chunk;
      }

      // Await the promises that resolve to arrays
      const allToolCalls = await streamResult.toolCalls;
      const allToolResults = await streamResult.toolResults;

      // Debug logging
      console.log(
        `[ExecutionAgent] Tool calls count: ${allToolCalls?.length || 0}`
      );
      console.log(
        `[ExecutionAgent] Tool results count: ${allToolResults?.length || 0}`
      );
      if (allToolCalls && allToolCalls.length > 0) {
        console.log(
          `[ExecutionAgent] First tool call:`,
          JSON.stringify(allToolCalls[0], null, 2)
        );
      }
      if (allToolResults && allToolResults.length > 0) {
        console.log(
          `[ExecutionAgent] First tool result:`,
          JSON.stringify(allToolResults[0], null, 2)
        );
      }

      // Log execution details
      if (toolCallResults.length > 0) {
        this.sendInfo(`Made ${toolCallResults.length} total tool call(s)`);
      }

      // Use LLM's text output directly - tool results are auto-saved in DataRegistry
      const outputText = fullText || "Task completed.";

      const taskResult: TaskResult = {
        taskId: task.id,
        success: true,
        output: outputText,
        data: {
          toolCalls: allToolCalls?.map((tc: any) => ({
            toolName: tc.toolName,
            args: "args" in tc ? tc.args : undefined,
          })),
          toolResults: toolCallResults.map((tr) => ({
            toolName: tr.toolName,
            result: tr.result,
          })),
        },
        completedAt: new Date(),
      };

      // Store comprehensive task data in DataRegistry for cross-task access
      // Use the captured tool results from our HOF wrapper
      let capturedToolData = "";
      if (toolCallResults.length > 0) {
        toolCallResults.forEach((tr, index) => {
          capturedToolData += `\n=== ${tr.toolName} (call ${index + 1}) ===\n`;
          capturedToolData += JSON.stringify(tr.result, null, 2);
          capturedToolData += "\n";
        });
      }

      // Convert to a string format for LLM context consumption
      let storedDataString = `TASK: ${task.description}\n\n`;
      storedDataString += `SUMMARY:\n${fullText || "No summary provided"}\n\n`;
      storedDataString += `RAW TOOL OUTPUT (${toolCallResults.length} tool calls):\n${capturedToolData}`;

      this.executionContext!.getDataRegistry().store(
        task.id,
        storedDataString,
        task.slug
      );

      if (toolCallResults.length > 0) {
        this.sendInfo(
          `Stored task data in registry: ${task.slug || task.id} (${storedDataString.length} chars, ${toolCallResults.length} tool results)`
        );
      } else {
        this.sendInfo(
          `Stored task summary in registry: ${task.slug || task.id} (${storedDataString.length} chars, no tool results)`
        );
      }

      // Update execution context
      this.executionContext!.updateWithResult(task, taskResult);

      this.sendStatus(
        `Task completed: ${task.description}.\n${taskResult.output}`
      );

      return taskResult;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";

      // Check if this is a rate limit error
      const isRateLimitError =
        error instanceof Error &&
        (error.message.includes("quota") ||
          error.message.includes("rate limit") ||
          error.message.includes("RESOURCE_EXHAUSTED") ||
          (typeof error === "object" &&
            error !== null &&
            "statusCode" in error &&
            (error as { statusCode: number }).statusCode === 429));

      if (isRateLimitError) {
        // Extract retry time if available
        const retryMatch = errorMsg.match(/retry in ([\d.]+)s/i);
        const retryTime = retryMatch
          ? Math.ceil(parseFloat(retryMatch[1]))
          : 60;

        const rateLimitMsg =
          `⚠️ API Rate Limit Exceeded - Workflow stopped.\n\n` +
          `The AI provider (Gemini) has rate limited requests. Please wait ${retryTime} seconds and try again.\n\n` +
          `This typically happens when:\n` +
          `• Too many requests in a short time\n` +
          `• Monthly token quota exceeded\n` +
          `• Check your API plan at: https://ai.google.dev/gemini-api/docs/rate-limits`;

        this.sendError(rateLimitMsg);

        const result: TaskResult = {
          taskId: task.id,
          success: false,
          output: "",
          error: rateLimitMsg,
          isRateLimitError: true, // Flag to stop workflow
          completedAt: new Date(),
        };

        this.executionContext!.updateWithResult(task, result);

        // Return the error result (don't rethrow - let workflow handle it gracefully)
        return result;
      }

      // Handle other errors normally
      this.sendError(`Task failed: ${errorMsg}`);

      const result: TaskResult = {
        taskId: task.id,
        success: false,
        output: "",
        error: errorMsg,
        completedAt: new Date(),
      };

      // Update execution context with failure
      this.executionContext!.updateWithResult(task, result);

      return result;
    }
  }
}
