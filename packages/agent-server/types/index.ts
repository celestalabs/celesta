export type XId<X extends string> = `${X}_${string}`;

export type ClientId = XId<"CLIENT">;
export type ToolCallId = XId<"TOOL">;
export type ContextId = "CHAT" | XId<"WORKFLOW">;
export type RequestId = XId<"REQUEST">;

export type IncomingWSUserMessage = {
  type: "USER_MESSAGE";
  context: ContextId;
  content: string;
};

export type IncomingWSResponseMessage =
  | {
      type: "PROVIDE_CREDENTIALS";
      integrationName: string;
      accessToken: string;
      requestId: RequestId;
    }
  | {
      type: "PROVIDE_QUESTION_RESPONSE";
      response: string;
      contextId: ContextId;
      requestId: RequestId;
    };

export type IncomingWSMessage =
  | IncomingWSUserMessage
  | IncomingWSResponseMessage;

export type OutgoingWSMessage =
  | {
      type: "AGENT_MESSAGE";
      contextId: ContextId;
      content: string;
    }
  | {
      type: "TOOL_INVOCATION";
      toolCallId: ToolCallId;
      contextId: ContextId;
      toolName: string;
      input: string;
    }
  | { type: "TOOL_RESULT"; toolCallId: ToolCallId; output: string }
  | {
      type: "REQUEST_CREDENTIALS";
      integrationName: string;
      requestId: RequestId;
    }
  | {
      type: "REQUEST_QUESTION_RESPONSE";
      question: string;
      contextId: ContextId;
      requestId: RequestId;
    };

export type WSMessage = IncomingWSMessage | OutgoingWSMessage;
