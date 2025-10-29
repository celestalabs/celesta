// Common types used across the workflow system

export type ExecutionStatus = "running" | "completed" | "failed";

export interface Task {
  id: string;
  slug?: string; // Human-readable identifier like "email-query-1"
  description: string;
  goal: string;
  status: "pending" | "running" | "completed" | "failed";
  createdAt: Date;
}

export interface TaskResult {
  taskId: string;
  success: boolean;
  output: string; // Natural language description of the outcome
  data?: any; // Optional structured data from the task execution
  error?: string; // Error message if failed
  isRateLimitError?: boolean; // Flag to indicate rate limit error (stops workflow)
  completedAt: Date;
}

export interface ToolSelection {
  toolId: string;
  reason: string;
}
