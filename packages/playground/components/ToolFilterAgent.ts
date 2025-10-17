import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { ExecutionContext } from "./ExecutionContext.js";
import { Task, ToolSelection } from "./types.js";
import { toolMetadata, toolRegistry, ToolId } from "./tools.js";

interface ToolFilterAgentConfig {
  executionContext: ExecutionContext;
}

const ToolSelectionSchema = z.object({
  selectedTools: z
    .array(
      z.object({
        toolId: z
          .string()
          .describe("The ID of the selected tool"),
        reason: z
          .string()
          .describe("Why this tool is relevant for the task"),
      })
    )
    .describe("List of selected tools with reasoning"),
  reasoning: z
    .string()
    .describe("Overall reasoning for the tool selection strategy"),
});

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

/**
 * ToolFilterAgent selects appropriate tools for each task.
 * It narrows down the available tools to only those relevant for execution.
 */
export class ToolFilterAgent {
  private executionContext: ExecutionContext;
  private model = google("gemini-2.5-flash");

  constructor(config: ToolFilterAgentConfig) {
    this.executionContext = config.executionContext;
  }

  /**
   * Select relevant tools for the given task
   */
  async run({ task }: { task: Task }): Promise<typeof toolRegistry> {
    const messagePipe = this.executionContext.getMessagePipe();
    messagePipe.send(
      "status",
      "Analyzing available tools for task...",
      "ToolFilterAgent"
    );

    const availableToolDescriptions = Object.entries(toolMetadata)
      .map(
        ([id, meta]) =>
          `- ${id}: ${meta.description}`
      )
      .join("\n");

    // Get previous task data to inform tool selection
    const previousTaskData = this.executionContext.getAllTaskData();
    const previousTasksContext =
      previousTaskData.length > 0
        ? `\n\nPrevious Tasks Completed:\n${previousTaskData
            .map(
              (taskData, idx) =>
                `Task ${idx + 1}: ${taskData.taskDescription}\n  Goal: ${taskData.taskGoal}\n  Success: ${taskData.success}\n  Output: ${taskData.output}\n  Data Available: ${Object.keys(taskData.data || {}).length > 0 ? "Yes" : "No"}`
            )
            .join("\n\n")}`
        : "";

    try {
      const { object } = await generateObject({
        model: this.model,
        schema: ToolSelectionSchema,
        prompt: `You are a tool selection agent. Your job is to select the most relevant tools from the available registry for a specific task.

Task Description: ${task.description}
Task Goal: ${task.goal}

Available Tools:
${availableToolDescriptions}${previousTasksContext}

IMPORTANT RULES:
1. If this task is about SYNTHESIS or COMPILATION of data that was already collected in previous tasks, DO NOT select any tools (return empty array)
2. If previous tasks already collected the necessary data, DO NOT select tools to fetch it again
3. ONLY select tools if this task needs to retrieve NEW information that hasn't been collected yet
4. For synthesis/summary tasks, the ExecutionAgent will use previously collected data without tools

Select ONLY the tools that are directly relevant to accomplishing this task. Provide reasoning for each selection.
If no tools are needed, select an empty array.`,
      });

      messagePipe.send(
        "info",
        `Tool selection reasoning: ${object.reasoning}`,
        "ToolFilterAgent"
      );

      // Filter the tool registry to only include selected tools
      const selectedTools: Record<string, any> = {};
      
      for (const selection of object.selectedTools) {
        const toolId = selection.toolId as ToolId;
        if (toolRegistry[toolId]) {
          selectedTools[toolId] = toolRegistry[toolId];
          messagePipe.send(
            "info",
            `Selected tool: ${toolId} - ${selection.reason}`,
            "ToolFilterAgent"
          );
        }
      }

      const toolCount = Object.keys(selectedTools).length;
      messagePipe.send(
        "status",
        `Selected ${toolCount} tool(s) for task execution`,
        "ToolFilterAgent"
      );

      return selectedTools as typeof toolRegistry;
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Unknown error";
      messagePipe.send(
        "error",
        `Failed to select tools: ${errorMsg}`,
        "ToolFilterAgent"
      );
      // Return empty tools on error
      return {} as typeof toolRegistry;
    }
  }
}
