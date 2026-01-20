import type { ModelMessage } from "ai";
import type { BrowserAgentAction, BrowserContextAction } from "./browser.js";
import type {
  BrowserAgentId,
  ContextId,
  RequestId,
  ToolCallId,
  WorkflowId,
} from "./ids.js";
import type {
  UIWorkflowTask,
  WorkflowMetadata,
  WorkflowStatus,
  WorkflowTaskStatus,
} from "./workflow.js";

export type FrontendWSUserMessage = {
  type: "USER_MESSAGE";
  contextId: ContextId;
  data: ModelMessage;
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
      type: "PROVIDE_BROWSER_CONTEXT_ACTION";
      requestId: RequestId;
      response: object;
      timestamp: number;
    }
  | {
      type: "PROVIDE_BROWSER_AGENT_ACTION";
      contextId: ContextId;
      requestId: RequestId;
      response: object;
      timestamp: number;
    };

export type FrontendWSRequestMessage = {
  type: "REQUEST_WORKFLOW";
  prompt: string;
};

export type FrontendWSMessage =
  | FrontendWSUserMessage
  | FrontendWSResponseMessage
  | FrontendWSRequestMessage
  | FrontendWSVoiceMessage;

export type AgentMessageType = "error" | "final" | "chat";

export type ServerWSAgentMessage = {
  type: "AGENT_MESSAGE";
  messageType: AgentMessageType;
  contextId: ContextId;
  data: ModelMessage;
  timestamp: number;
  stream?: true;
};

export type ServerWSToolMessage =
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

export type ServerWSRequestMessage =
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
      type: "REQUEST_BROWSER_CONTEXT_ACTION";
      requestId: RequestId;
      action: BrowserContextAction;
      timestamp: number;
    }
  | {
      type: "REQUEST_BROWSER_AGENT_ACTION";
      contextId: ContextId;
      requestId: RequestId;
      action: BrowserAgentAction;
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
    ))
  | {
      type: "BROWSER_AGENT_INITIALIZED";
      contextId: ContextId;
      browserAgentId: BrowserAgentId;
      toolCallId: ToolCallId;
      existingTabId?: number; // If provided, reuse this tab instead of creating new
      workflowId?: WorkflowId; // If part of a workflow, used to track tab across subtasks
      timestamp: number;
    };

export type ServerWSMessage =
  | ServerWSAgentMessage
  | ServerWSRequestMessage
  | ServerWSToolMessage
  | ServerWSWorkflowMessage
  | ServerWSVoiceMessage
  | {
      type: "CONTEXT_CREATED";
      contextId: ContextId;
      timestamp: number;
    };

export type ConversationWSMessage =
  | ServerWSAgentMessage
  | FrontendWSUserMessage;

export type WSMessage = FrontendWSMessage | ServerWSMessage;

// Voice message types for STT/TTS via WebSocket
export type VoiceSessionId = `VOICE_${string}`;

export type FrontendWSVoiceMessage =
  | {
      type: "VOICE_START";
      sessionId: VoiceSessionId;
      timestamp: number;
    }
  | {
      type: "VOICE_AUDIO_CHUNK";
      sessionId: VoiceSessionId;
      // Base64 encoded audio data
      audioData: string;
      timestamp: number;
    }
  | {
      type: "VOICE_STOP";
      sessionId: VoiceSessionId;
      timestamp: number;
    }
  | {
      type: "REQUEST_TTS";
      // Text to convert to speech
      text: string;
      timestamp: number;
    };

export type ServerWSVoiceMessage =
  | {
      type: "VOICE_TRANSCRIPT";
      sessionId: VoiceSessionId;
      transcript: string;
      isFinal: boolean;
      timestamp: number;
    }
  | {
      type: "VOICE_TTS_CHUNK";
      // Base64 encoded audio data (mp3)
      audioData: string;
      timestamp: number;
    }
  | {
      type: "VOICE_TTS_COMPLETE";
      timestamp: number;
    }
  | {
      type: "VOICE_ERROR";
      sessionId?: VoiceSessionId;
      error: string;
      timestamp: number;
    };
