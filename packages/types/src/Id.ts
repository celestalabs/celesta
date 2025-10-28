export type XId<X extends string> = `${X}_${string}`;

export type ClientId = XId<"CLIENT">;
export type ToolCallId = XId<"TOOL">;
export type WorkflowId = XId<"WORKFLOW">;
export type ContextId = "CHAT" | WorkflowId;
export type RequestId = XId<"REQUEST">;