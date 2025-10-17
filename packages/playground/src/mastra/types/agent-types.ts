import { z } from "zod";

// Core task status states
export const TaskStatusSchema = z.enum([
  "pending",
  "in-progress", 
  "suspended",
  "completed",
  "failed",
  "requires-human"
]);

export type TaskStatus = z.infer<typeof TaskStatusSchema>;

// Task step definition
export const TaskStepSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  status: TaskStatusSchema,
  assignedAgent: z.string().optional(),
  dependencies: z.array(z.string()).default([]),
  metadata: z.record(z.any(), z.any()).default({}),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type TaskStep = z.infer<typeof TaskStepSchema>;

// Main task that contains multiple steps
export const TaskSchema = z.object({
  id: z.string(),
  originalPrompt: z.string(),
  steps: z.array(TaskStepSchema),
  currentStepId: z.string().optional(),
  status: TaskStatusSchema,
  metadata: z.record(z.any(), z.any()).default({}),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Task = z.infer<typeof TaskSchema>;

// Agent execution result
export const AgentResultSchema = z.object({
  success: z.boolean(),
  taskId: z.string(),
  stepId: z.string(),
  agentName: z.string(),
  status: TaskStatusSchema,
  result: z.any().optional(),
  error: z.string().optional(),
  suspendReason: z.string().optional(),
  humanMessage: z.string().optional(),
  nextActions: z.array(z.string()).default([]),
});

export type AgentResult = z.infer<typeof AgentResultSchema>;

// Tool information for Tool Filter Agent
export const ToolInfoSchema = z.object({
  name: z.string(),
  description: z.string(),
  category: z.enum(["integration", "browser", "human"]),
  priority: z.number().min(1).max(10),
  capabilities: z.array(z.string()),
  requiredParams: z.array(z.string()).default([]),
});

export type ToolInfo = z.infer<typeof ToolInfoSchema>;

// Agent message for inter-agent communication
export const AgentMessageSchema = z.object({
  id: z.string(),
  fromAgent: z.string(),
  toAgent: z.string(),
  messageType: z.enum([
    "task-assignment",
    "task-result", 
    "tool-request",
    "tool-response",
    "status-update",
    "human-request"
  ]),
  taskId: z.string(),
  stepId: z.string().optional(),
  payload: z.any(),
  timestamp: z.date(),
});

export type AgentMessage = z.infer<typeof AgentMessageSchema>;

// Base agent interface
export interface BaseAgent {
  name: string;
  description: string;
  executeTask(task: Task, step: TaskStep): Promise<AgentResult>;
  canHandle(step: TaskStep): boolean;
}

// Coordination Agent specific types
export const WorkflowStateSchema = z.object({
  taskId: z.string(),
  currentStep: z.number(),
  totalSteps: z.number(),
  stepStatuses: z.record(z.string(), TaskStatusSchema),
  lastUpdated: z.date(),
});

export type WorkflowState = z.infer<typeof WorkflowStateSchema>;