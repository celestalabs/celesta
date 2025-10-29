import { WorkflowId } from "./ids.js";

export type WorkflowStatus = "running" | "completed" | "failed";

export interface WorkflowMetadata {
  workflowId: WorkflowId;
  prompt: string;
  status: WorkflowStatus;
}

export interface WorkflowTask {
  slug: string; // Human-readable identifier like "email-query-1"
  description: string;
  goal: string;
  tools: string[];
  status: "pending" | "in-progress" | "completed" | "failed";
}

export type WorkflowTaskResult = {
  taskSlug: string;
} & (
  | { success: true; finalResult: string; toolCallResults: [string, string][] }
  | { success: false; error: string }
);