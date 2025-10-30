import { ContextId, RequestId, ToolCallId, WorkflowId } from "./ids.js";
import {
  MinimalWorkflowTask,
  UIWorkflowTask,
  WorkflowMetadata,
  WorkflowStatus,
  WorkflowTaskStatus,
} from "./workflow.js";

export type FrontendWSUserMessage = {
  type: "USER_MESSAGE";
  contextId: ContextId;
  content: string;
  timestamp: number;
};

export type FrontendWSResponseMessage =
  | {
      type: "PROVIDE_CREDENTIALS";
      integrationName: string;
      accessToken: string;
      requestId: RequestId;
      timestamp: number;
    }
  | {
      type: "PROVIDE_QUESTION_RESPONSE";
      response: string;
      contextId: ContextId;
      requestId: RequestId;
      timestamp: number;
    }
  | {
      type: "PROVIDE_SHOULD_START_WORKFLOW";
      contextId: ContextId;
      requestId: RequestId;
      yes: boolean;
      timestamp: number;
    }
  | {
      type: "PROVIDE_BROWSER_GET_PAGE_CONTENT";
      requestId: RequestId;
      pageContent: string;
      timestamp: number;
    }
  | {
      type: "PROVIDE_BROWSER_LIST_OPEN_TABS";
      requestId: RequestId;
      openTabs: { title: string; url: string; isActive: boolean }[];
      timestamp: number;
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
  timestamp: number;
};

export type ServerToolWSMessage =
  | {
      type: "TOOL_INVOCATION";
      toolCallId: ToolCallId;
      contextId: ContextId;
      toolName: string;
      input: string;
      timestamp: number;
    }
  | {
      type: "TOOL_RESULT";
      toolCallId: ToolCallId;
      contextId: ContextId;
      output: string;
      timestamp: number;
    };

export type ServerRequestWSMessage =
  | {
      type: "REQUEST_CREDENTIALS";
      integrationName: string;
      requestId: RequestId;
      timestamp: number;
    }
  | {
      type: "REQUEST_QUESTION_RESPONSE";
      question: string;
      contextId: ContextId;
      requestId: RequestId;
      timestamp: number;
    }
  | {
      type: "REQUEST_SHOULD_START_WORKFLOW";
      contextId: ContextId;
      requestId: RequestId;
      content: string;
      suggestedPrompt: string;
      confidence: "low" | "medium" | "high";
      reasoning: string;
      timestamp: number;
    }
  | {
      type: "REQUEST_BROWSER_GET_PAGE_CONTENT";
      requestId: RequestId;
      titleOfOpenTab: string;
      timestamp: number;
    }
  | {
      type: "REQUEST_BROWSER_LIST_OPEN_TABS";
      requestId: RequestId;
      timestamp: number;
    };

export type ServerWSWorkflowMessage =
  | ({
      type: "WORKFLOW_STATUS_CHANGED";
      workflowId: WorkflowId;
      timestamp: number;
    } & (
      | ({ status: "running" } & WorkflowMetadata)
      | { status: Exclude<WorkflowStatus, "running"> }
    ))
  | ({
      type: "WORKFLOW_TASK_STATUS_CHANGED";
      workflowId: WorkflowId;
      timestamp: number;
      slug: string;
    } & (
      | ({ status: "pending" } & Omit<UIWorkflowTask, "type">)
      | { status: Exclude<WorkflowTaskStatus, "pending"> }
    ));

export type ServerWSMessage =
  | ServerWSAgentMessage
  | ServerRequestWSMessage
  | ServerToolWSMessage
  | ServerWSWorkflowMessage
  | {
      type: "CONTEXT_CREATED";
      contextId: ContextId;
      timestamp: number;
    };

export type ConversationWSMessage =
  | ServerWSAgentMessage
  | FrontendWSUserMessage;

export type WSMessage = FrontendWSMessage | ServerWSMessage;
