import { generateObject } from "ai";
import { z } from "zod";
import { BaseAgent, BaseAgentConfig } from "./BaseAgent.js";
import { Task } from "../types/types.js";

const NextTaskSchema = z.object({
  shouldContinue: z
    .boolean()
    .describe("Whether there are more tasks to execute"),
  reasoning: z
    .string()
    .describe("Reasoning for the decision to continue or stop"),
  task: z
    .object({
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

    try {
      const { object } = await generateObject({
        model: this.model,
        schema: NextTaskSchema,
        prompt: `You are a coordination agent that breaks down complex tasks into smaller, manageable subtasks.

Current Context:
${detailedContextSummary}

Your job is to:
1. Analyze the original prompt and what has been done so far
2. Review what DATA and INFORMATION has already been collected
3. Determine if more tasks are needed to complete the request
4. If yes, define the next specific task to execute
5. If no, signal that execution should complete

IMPORTANT RULES:
- DO NOT create tasks to retrieve information that has already been collected
- If data collection is complete, create a SYNTHESIS/COMPILATION task that works with existing data
- Synthesis tasks should NOT re-fetch data, they should summarize and compile what's already available
- Each data retrieval task should be something that can be executed using available tools (Gmail, Calendar, Web Search, YouTube, Notion, Wolfram Alpha)
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
        description: object.task.description,
        goal: object.task.goal,
        status: "pending",
        createdAt: new Date(),
      };

      this.executionContext.addTask(task);
      this.sendStatus(`Next task created: ${task.description}`);

      return task;
    } catch (error) {
      this.executionContext.markAsFailed(
        error instanceof Error ? error.message : "Unknown error"
      );
      this.handleError(error, "determine next task");
    }
  }
}
