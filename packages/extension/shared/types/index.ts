import { RequestId } from "@celesta/types";

export type UIMessageRepr =
  | { type: "user" | "agent"; content: string }
  | { type: "tool"; toolName: string; input: string; output: string | null }
  | { type: "workflow-request"; prompt: string; requestId: RequestId };
