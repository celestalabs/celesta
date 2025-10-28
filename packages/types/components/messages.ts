import { ContextId, RequestId, ToolCallId } from "./ids.js";

export type FrontendWSUserMessage = {
  type: "USER_MESSAGE";
  contextId: ContextId;
  content: string;
};

export type FrontendWSResponseMessage =
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
    }
  | {
      type: "PROVIDE_SHOULD_START_WORKFLOW";
      contextId: ContextId;
      requestId: RequestId;
      yes: boolean;
    };

export type FrontendWSMessage =
  | FrontendWSUserMessage
  | FrontendWSResponseMessage;

export type AgentMessageType = "error" | "final" | "chat";

export type ServerWSAgentMessage = {
  type: "AGENT_MESSAGE";
  messageType: AgentMessageType;
  contextId: ContextId;
  content: string;
};

export type ServerWSMessage =
  | ServerWSAgentMessage
  | {
      type: "TOOL_INVOCATION";
      toolCallId: ToolCallId;
      contextId: ContextId;
      toolName: string;
      input: string;
    }
  | {
      type: "TOOL_RESULT";
      toolCallId: ToolCallId;
      contextId: ContextId;
      output: string;
    }
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
    }
  | {
      type: "REQUEST_SHOULD_START_WORKFLOW";
      contextId: ContextId;
      requestId: RequestId;
      content: string;
      suggestedPrompt: string;
      confidence: "low" | "medium" | "high";
      reasoning: string;
    };

export type ConversationWSMessage =
  | ServerWSAgentMessage
  | FrontendWSUserMessage;

export type WSMessage = FrontendWSMessage | ServerWSMessage;
