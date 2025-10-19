import { generateObject } from "ai";
import { z } from "zod";
import { BaseAgent, BaseAgentConfig } from "./BaseAgent.js";
import { Task } from "../types/types.js";
import { formatToolMetadataForPrompt } from "../components/dynamicTools.js";

const NextTaskSchema = z.object({
  shouldContinue: z
    .boolean()
    .describe("Whether there are more tasks to execute"),
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
    .optional()
    .describe("The next task to execute, if shouldContinue is true"),
});

/**
 * CoordinationAgent determines the next task to execute based on context.
 * It breaks down complex prompts into manageable subtasks and tracks progress.
 */
export class CoordinationAgent extends BaseAgent {
  protected agentName = "CoordinationAgent";

  constructor(config: BaseAgentConfig) {
    super(config);
  }

  /**
   * Determine the next task to execute based on current context
   */
  async nextTask(): Promise<Task> {
    this.sendStatus("Analyzing context to determine next task...");

    const detailedContextSummary = this.getDetailedContext();
    const prompt = this.getPrompt();
    const toolMetadata = this.executionContext.getToolMetadata();
    const availableToolsText = formatToolMetadataForPrompt(toolMetadata);

    try {
      const now = new Date();
      const dateString = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

      const { object } = await generateObject({
        model: this.model,
        schema: NextTaskSchema,
        prompt: `You are an autonomous coordination agent that breaks down complex tasks and makes intelligent decisions.

Current Date: ${dateString}

Current Context:
${detailedContextSummary}

${availableToolsText}

Your job is to:
1. Analyze the original prompt and what has been done so far
2. Review what DATA and INFORMATION has already been collected
3. Determine if more tasks are needed to complete the request
4. If yes, define the next specific task to execute
5. If no, signal that execution should complete

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
- If data collection is complete, create a SYNTHESIS/COMPILATION task that works with existing data
- Synthesis tasks should NOT re-fetch data, they should summarize and compile what's already available
- Each data retrieval task should be something that can be executed using the available tools listed above
- Synthesis tasks should work purely with previously collected data

Be specific and actionable in task descriptions.

If all necessary tasks have been completed (both data collection AND final synthesis), set shouldContinue to false.`,
      });

      this.sendInfo(`Reasoning: ${object.reasoning}`);

      if (!object.shouldContinue) {
        this.sendStatus("No more tasks needed. Marking execution as complete.");
        this.executionContext.markAsCompleted();
        
        // Return a dummy task that won't be executed
        return {
          id: "completed",
          description: "All tasks completed",
          goal: "Execution finished",
          status: "completed",
          createdAt: new Date(),
        };
      }

      if (!object.task) {
        throw new Error("Task is required when shouldContinue is true");
      }

      // Create a new task
      const task: Task = {
        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        slug: object.task.slug,
        description: object.task.description,
        goal: object.task.goal,
        status: "pending",
        createdAt: new Date(),
      };

      this.executionContext.addTask(task);
      this.sendStatus(`Next task created: ${task.slug} - ${task.description}`);

      return task;
    } catch (error) {
      this.executionContext.markAsFailed(
        error instanceof Error ? error.message : "Unknown error"
      );
      this.handleError(error, "determine next task");
    }
  }
}
