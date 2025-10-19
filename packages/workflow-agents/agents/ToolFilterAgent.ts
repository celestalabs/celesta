import { generateObject, ToolSet } from "ai";
import { z } from "zod";
import { BaseAgent, BaseAgentConfig } from "./BaseAgent.js";
import { Task } from "../types/types.js";

const ToolSelectionSchema = z.object({
  selectedTools: z
    .array(
      z.object({
        toolId: z.string().describe("The ID of the selected tool"),
        reason: z.string().describe("Why this tool is relevant for the task"),
      })
    )
    .describe("List of selected tools with reasoning"),
  reasoning: z
    .string()
    .describe("Overall reasoning for the tool selection strategy"),
});

/**
 * ToolFilterAgent selects appropriate tools for each task.
 * It narrows down the available tools to only those relevant for execution.
 */
export class ToolFilterAgent extends BaseAgent {
  protected agentName = "ToolFilterAgent";

  constructor(config: BaseAgentConfig) {
    super(config);
  }

  /**
   * Select relevant tools for the given task
   */
  async run({ task }: { task: Task }): Promise<ToolSet> {
    this.sendStatus("Analyzing available tools for task...");

    const allTools = this.executionContext.getTools();
    const toolMetadata = this.executionContext.getToolMetadata();

    const availableToolDescriptions = toolMetadata
      .map((meta) => {
        const toolName = `${meta.integrationName}__${meta.actionName}`;
        return `- ${toolName}: ${meta.description}`;
      })
      .join("\n");

    // Get previous task data to inform tool selection
    const previousTaskData = this.getPreviousTaskData();
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
      const now = new Date();
      const dateString = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

      const { object } = await generateObject({
        model: this.model,
        schema: ToolSelectionSchema,
        prompt: `You are an autonomous tool selection agent. Your job is to select the most relevant tools from the available registry for a specific task.

Current Date: ${dateString}

Task Description: ${task.description}
Task Goal: ${task.goal}

Available Tools:
${availableToolDescriptions}${previousTasksContext}

AUTONOMY PRINCIPLES:
- Select tools that enable COMPREHENSIVE data gathering
- When multiple sources might be relevant (e.g., multiple calendars, email folders), select tools to check ALL of them
- Default to gathering MORE rather than LESS information
- Make reasonable assumptions about what the user wants
- Examples:
  * "upcoming events" → select tools for ALL calendar sources
  * "recent activity" → select tools for ALL relevant activity streams
  * "my contacts" → select tools to get complete contact information
- DO NOT select tools that would require asking clarifying questions

TOOL SELECTION PRIORITY:
- PREFER specialized tools (web_search, gmail, google_calendar, etc.) over browser_use when possible
- browser_use should be a LAST RESORT when:
  * Other tools are not working properly
  * The required functionality is not available in existing tools
  * The task requires complex web interactions that specialized tools cannot handle
- For search tasks, ALWAYS prefer web_search tools (search_web, find_similar, get_contents, answer_question) over browser_use
- For retrieval tasks, use the appropriate specialized integration tools rather than the browser

IMPORTANT RULES:
1. If this task is about SYNTHESIS or COMPILATION of data that was already collected in previous tasks, DO NOT select any tools (return empty array)
2. If previous tasks already collected the necessary data, DO NOT select tools to fetch it again
3. ONLY select tools if this task needs to retrieve NEW information that hasn't been collected yet
4. For synthesis/summary tasks, the ExecutionAgent will use previously collected data without tools

Select ALL tools that are relevant to accomplishing this task comprehensively. Provide reasoning for each selection.
If no tools are needed, select an empty array.`,
      });

      this.sendInfo(`Tool selection reasoning: ${object.reasoning}`);

      // Filter the tool registry to only include selected tools
      const selectedTools: ToolSet = {};

      for (const selection of object.selectedTools) {
        const toolId = selection.toolId;
        if (allTools[toolId]) {
          selectedTools[toolId] = allTools[toolId];
          this.sendInfo(`Selected tool: ${toolId} - ${selection.reason}`);
        } else {
          this.sendInfo(`Warning: Tool ${toolId} not found in registry`);
        }
      }

      const toolCount = Object.keys(selectedTools).length;
      this.sendStatus(`Selected ${toolCount} tool(s) for task execution`);

      return selectedTools;
    } catch (error) {
      this.sendError(
        `Failed to select tools: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      // Return empty tools on error
      return {};
    }
  }
}
