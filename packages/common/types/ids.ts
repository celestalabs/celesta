export type XId<X extends string> = `${X}_${string}`;

export type ClientId = XId<"CLIENT">;
export type ToolCallId = XId<"TOOL">;
export type WorkflowId = XId<"WORKFLOW">;
export type BrowserAgentId = XId<"BROWSER_AGENT">;
export type ContextId =
  | "CHAT"
  | "BROWSER_CONTEXT"
  | BrowserAgentId
  | WorkflowId;
export type RequestId = XId<"REQUEST">;

export const isWorkflowId = (id: ContextId): id is WorkflowId => {
  return id.startsWith("WORKFLOW_");
};

export const isBrowserAgentId = (id: ContextId): id is BrowserAgentId => {
  return id.startsWith("BROWSER_AGENT_");
};

export const isChatId = (id: ContextId): id is "CHAT" => {
  return id === "CHAT";
};

export const isBrowserContextId = (id: ContextId): id is "BROWSER_CONTEXT" => {
  return id === "BROWSER_CONTEXT";
};
