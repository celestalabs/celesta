import { WorkflowId } from "./ids.js";

export type WorkflowStatus = "running" | "completed" | "failed" | "finishing";
export type WorkflowTaskStatus = "pending" | "running" | "completed" | "failed";

export interface WorkflowMetadata {
  workflowId: WorkflowId;
  prompt: string;
  status: WorkflowStatus;
}

export interface MinimalWorkflowTask {
  slug: string;
  description: string;
  status: WorkflowTaskStatus;
}

export interface UIWorkflowTask extends MinimalWorkflowTask {
  type: "UI_WORKFLOW_TASK";
  timestamp: number;
}

export interface WorkflowTask extends MinimalWorkflowTask {
  goal: string;
  tools: string[];
}

export type WorkflowTaskResult = {
  taskSlug: string;
} & (
  | { success: true; finalResult: string; toolCallResults: [string, string][] }
  | { success: false; error: string }
);
