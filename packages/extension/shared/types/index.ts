import {
  AgentMessageType,
  ContextId,
  RequestId,
  WorkflowTaskStatus,
} from "@celesta/types";

export type UIMessageRepr =
  | { type: "user"; content: string }
  | { type: "agent"; content: string; messageType: AgentMessageType }
  | { type: "tool"; toolName: string; input: string; output: string | null }
  | { type: "workflow-request"; prompt: string; requestId: RequestId }
  | {
      type: "workflow-task";
      slug: string;
      description: string;
      status: WorkflowTaskStatus;
    };

export type ViewId = ContextId | "WORKFLOW_LIST";
