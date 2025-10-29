import { ContextId, RequestId, ToolCallId, WorkflowId } from "./ids.js";
import {
  MinimalWorkflowTask,
  WorkflowMetadata,
  WorkflowStatus,
  WorkflowTaskStatus,
} from "./workflow.js";

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

export type ServerToolWSMessage =
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
    };

export type ServerRequestWSMessage =
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

export type ServerWSWorkflowMessage =
  | ({
      type: "WORKFLOW_STATUS_CHANGED";
      workflowId: WorkflowId;
    } & (
      | ({ status: "running" } & WorkflowMetadata)
      | { status: Exclude<WorkflowStatus, "running"> }
    ))
  | ({
      type: "WORKFLOW_TASK_STATUS_CHANGED";
      workflowId: WorkflowId;
    } & (
      | ({ status: "pending" } & MinimalWorkflowTask)
      | { status: Exclude<WorkflowTaskStatus, "pending">; slug: string }
    ));

export type ServerWSMessage =
  | ServerWSAgentMessage
  | ServerRequestWSMessage
  | ServerToolWSMessage
  | ServerWSWorkflowMessage
  | {
      type: "CONTEXT_CREATED";
      contextId: ContextId;
    };

export type ConversationWSMessage =
  | ServerWSAgentMessage
  | FrontendWSUserMessage;

export type WSMessage = FrontendWSMessage | ServerWSMessage;
