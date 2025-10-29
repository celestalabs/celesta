import { AgentMessageType, ContextId, RequestId } from "@celesta/types";

export type UIMessageRepr =
  | { type: "user"; content: string }
  | { type: "agent"; content: string; messageType: AgentMessageType }
  | { type: "tool"; toolName: string; input: string; output: string | null }
  | { type: "workflow-request"; prompt: string; requestId: RequestId };

export type ViewId = ContextId | "WORKFLOW_LIST";
