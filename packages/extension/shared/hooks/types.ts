import { WSMessage } from "./useWebSocket";

export type WorkflowStatus = "running" | "completed" | "failed";

export interface WorkflowState {
  id: string;
  prompt: string;
  status: WorkflowStatus;
  messages: WSMessage[];
  startedAt: Date;
  completedAt?: Date;
  pendingQuestion?: {
    messageId: string;
    question: string;
  };
  pendingCredentialRequest?: {
    messageId: string;
    integrationName: string;
  };
}

export interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "assistant";
  timestamp: Date;
}

export interface PendingIntent {
  messageId: string;
  suggestedPrompt: string;
  confidence: "high" | "medium" | "low";
  reasoning: string;
}

export type AppView = "chat" | "workflows-list" | "workflow-detail";

export interface AppState {
  currentView: AppView;
  selectedWorkflowId?: string;
}
