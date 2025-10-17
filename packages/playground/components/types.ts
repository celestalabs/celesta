// Common types used across the workflow system

export type ExecutionStatus = "running" | "completed" | "failed";

export interface Task {
  id: string;
  description: string;
  goal: string;
  status: "pending" | "in-progress" | "completed" | "failed";
  createdAt: Date;
}

export interface TaskResult {
  taskId: string;
  success: boolean;
  output: string; // Natural language description of the outcome
  data?: any; // Optional structured data from the task execution
  error?: string; // Error message if failed
  completedAt: Date;
}

export interface ToolSelection {
  toolId: string;
  reason: string;
}
