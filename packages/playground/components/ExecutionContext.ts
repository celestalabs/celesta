import { MessagePipe } from "../lib/MessagePipe.js";
import { Task, TaskResult, ExecutionStatus } from "../types/types.js";

interface ExecutionContextConfig {
  prompt: string;
  messagePipe: MessagePipe;
}

/**
 * ExecutionContext manages the state and context of task execution.
 * It stores the original prompt, tasks, results, and provides methods
 * to update and retrieve this information.
 */
export class ExecutionContext {
  private prompt: string;
  private messagePipe: MessagePipe;
  private tasks: Map<string, Task>;
  private results: Map<string, TaskResult>;
  private status: ExecutionStatus;
  private startTime: Date;
  private endTime?: Date;

  constructor(config: ExecutionContextConfig) {
    this.prompt = config.prompt;
    this.messagePipe = config.messagePipe;
    this.tasks = new Map();
    this.results = new Map();
    this.status = "running";
    this.startTime = new Date();
  }

  // Getters
  getPrompt(): string {
    return this.prompt;
  }

  getMessagePipe(): MessagePipe {
    return this.messagePipe;
  }

  getCompletionStatus(): ExecutionStatus {
    return this.status;
  }

  getTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  getResults(): TaskResult[] {
    return Array.from(this.results.values());
  }

  getResult(taskId: string): TaskResult | undefined {
    return this.results.get(taskId);
  }

  /**
   * Get all task data in a structured format for context-aware execution.
   * Returns both natural language outputs and tool data from all completed tasks.
   */
  getAllTaskData(): Array<{
    taskDescription: string;
    taskGoal: string;
    output: string;
    data: any;
    success: boolean;
  }> {
    const results = this.getResults();
    return results.map((result) => {
      const task = this.getTask(result.taskId);
      return {
        taskDescription: task?.description || "Unknown task",
        taskGoal: task?.goal || "Unknown goal",
        output: result.output,
        data: result.data,
        success: result.success,
      };
    });
  }

  /**
   * Get detailed context summary including actual data from completed tasks.
   * This provides more information than getContextSummary() for better decision-making.
   */
  getDetailedContextSummary(): string {
    const totalTasks = this.tasks.size;
    const completedTasks = Array.from(this.tasks.values()).filter(
      (t) => t.status === "completed"
    ).length;
    const failedTasks = Array.from(this.tasks.values()).filter(
      (t) => t.status === "failed"
    ).length;

    let summary = `Original Prompt: ${this.prompt}\n\n`;
    summary += `Progress: ${completedTasks}/${totalTasks} tasks completed`;
    if (failedTasks > 0) {
      summary += ` (${failedTasks} failed)`;
    }
    summary += `\n\n`;

    if (this.results.size > 0) {
      summary += `Completed Tasks and Their Results:\n`;
      const allTaskData = this.getAllTaskData();
      allTaskData.forEach((taskData, index) => {
        summary += `${index + 1}. Task: ${taskData.taskDescription}\n`;
        summary += `   Goal: ${taskData.taskGoal}\n`;
        if (taskData.output) {
          summary += `   Output: ${taskData.output}\n`;
        }
        if (taskData.data && taskData.data.toolResults) {
          summary += `   Data Retrieved: Available\n`;
        }
        summary += `\n`;
      });
    }

    return summary;
  }

  // Task management
  addTask(task: Task): void {
    this.tasks.set(task.id, task);
  }

  updateTaskStatus(
    taskId: string,
    status: Task["status"]
  ): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = status;
    }
  }

  // Result management
  addResult(result: TaskResult): void {
    this.results.set(result.taskId, result);
    this.updateTaskStatus(
      result.taskId,
      result.success ? "completed" : "failed"
    );
  }

  updateWithResult(task: Task, result: TaskResult): void {
    this.addResult(result);
  }

  // Status management
  markAsCompleted(): void {
    this.status = "completed";
    this.endTime = new Date();
    this.messagePipe.send(
      "status",
      "All tasks completed successfully!",
      "ExecutionContext"
    );
  }

  markAsFailed(reason?: string): void {
    this.status = "failed";
    this.endTime = new Date();
    this.messagePipe.send(
      "error",
      `Execution failed${reason ? `: ${reason}` : ""}`,
      "ExecutionContext"
    );
  }

  /**
   * Generate a cohesive response based on all task results.
   * This is useful for queries like "summarize what I have to do today"
   * that draw from multiple sources.
   */
  generateCohesiveResponse(): string {
    const results = this.getResults();
    if (results.length === 0) {
      return "No tasks were executed.";
    }

    const successfulResults = results.filter((r) => r.success);
    const failedResults = results.filter((r) => !r.success);

    let response = `Execution Summary:\n\n`;
    
    if (successfulResults.length > 0) {
      response += `Completed Tasks (${successfulResults.length}):\n`;
      successfulResults.forEach((result, index) => {
        const task = this.getTask(result.taskId);
        response += `${index + 1}. ${task?.description}: ${result.output}\n`;
      });
    }

    if (failedResults.length > 0) {
      response += `\nFailed Tasks (${failedResults.length}):\n`;
      failedResults.forEach((result, index) => {
        const task = this.getTask(result.taskId);
        response += `${index + 1}. ${task?.description}: ${result.error}\n`;
      });
    }

    return response;
  }

  /**
   * Get execution context summary for the coordination agent
   */
  getContextSummary(): string {
    const totalTasks = this.tasks.size;
    const completedTasks = Array.from(this.tasks.values()).filter(
      (t) => t.status === "completed"
    ).length;
    const failedTasks = Array.from(this.tasks.values()).filter(
      (t) => t.status === "failed"
    ).length;

    let summary = `Original Prompt: ${this.prompt}\n\n`;
    summary += `Progress: ${completedTasks}/${totalTasks} tasks completed`;
    if (failedTasks > 0) {
      summary += ` (${failedTasks} failed)`;
    }
    summary += `\n\n`;

    if (this.results.size > 0) {
      summary += `Recent Results:\n`;
      const recentResults = Array.from(this.results.values()).slice(-3);
      recentResults.forEach((result) => {
        const task = this.getTask(result.taskId);
        summary += `- ${task?.description}: ${result.output}\n`;
      });
    }

    return summary;
  }
}
