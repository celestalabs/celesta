import { useChatStore, useWorkflowsStore, useAppStore } from "./stores";

// Frontend version with timestamp as string (serialized from Date)
// We need to preserve the discriminated union structure for type narrowing
export type WSMessage =
  | {
      id: string;
      type: "status" | "info" | "error" | "final";
      content: string;
      sender: string;
      timestamp: string | Date;
      workflowId?: string;
    }
  | {
      id: string;
      type: "question";
      content: string;
      sender: string;
      timestamp: string | Date;
      isQuestion: true;
      workflowId?: string;
    }
  | {
      id: string;
      type: "request_credentials";
      content: string;
      sender: string;
      timestamp: string | Date;
      integrationName: string;
      workflowId?: string;
    }
  | {
      id: string;
      type: "provide_credentials";
      content: string;
      sender: string;
      timestamp: string | Date;
      integrationName: string;
      accessToken: string;
      workflowId?: string;
    }
  | {
      id: string;
      type: "tool_invocation";
      content: string;
      sender: string;
      timestamp: string | Date;
      toolCallId: string;
      toolName: string;
      toolArgs: any;
      workflowId?: string;
    }
  | {
      id: string;
      type: "tool_result";
      content: string;
      sender: string;
      timestamp: string | Date;
      toolCallId: string;
      toolName: string;
      toolResult: any;
      workflowId?: string;
    }
  | {
      id: string;
      type: "answer";
      content: string;
      sender: string;
      timestamp: string | Date;
      workflowId?: string;
    }
  | {
      id: string;
      type: "chat_message";
      content: string;
      sender: string;
      timestamp: string | Date;
    }
  | {
      id: string;
      type: "chat_response";
      content: string;
      sender: string;
      timestamp: string | Date;
    }
  | {
      id: string;
      type: "workflow_intent_detected";
      content: string;
      sender: string;
      timestamp: string | Date;
      suggestedPrompt: string;
      confidence: "high" | "medium" | "low";
      reasoning: string;
    }
  | {
      id: string;
      type: "workflow_started";
      content: string;
      sender: string;
      timestamp: string | Date;
      workflowId: string;
      prompt: string;
      hasNavButton: boolean;
    }
  | {
      id: string;
      type: "start_workflow";
      content: string;
      sender: string;
      timestamp: string | Date;
      prompt: string;
    };

let ws: WebSocket | null = null;
// Remove local connected state, use Zustand instead
const listeners: Array<(msg: WSMessage) => void> = [];

export function connectWebSocket(url: string) {
  if (ws) return;
  ws = new WebSocket(url);

  ws.onopen = () => {
    useAppStore.getState().setConnected(true);
    useAppStore.getState().setView("chat");
  };

  ws.onmessage = (event) => {
    try {
      const message: WSMessage = JSON.parse(event.data);
      handleWSMessage(message);
      listeners.forEach((cb) => cb(message));
    } catch (e) {
      console.error("Error parsing WebSocket message:", e);
    }
  };

  ws.onclose = () => {
    useAppStore.getState().setConnected(false);
    ws = null;
  };

  ws.onerror = (err) => {
    useAppStore.getState().setConnected(false);
    console.error("WebSocket error:", err);
  };
}

export function sendMessage(msg: object) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

export function subscribe(cb: (msg: WSMessage) => void) {
  listeners.push(cb);
}
export function unsubscribe(cb: (msg: WSMessage) => void) {
  const idx = listeners.indexOf(cb);
  if (idx !== -1) listeners.splice(idx, 1);
}

function handleWSMessage(message: WSMessage) {
  // Chat
  if (message.type === "chat_response") {
    useChatStore.getState().addAssistantMessage(message);
    return;
  }
  if (
    (message.type === "tool_invocation" || message.type === "tool_result") &&
    "workflowId" in message &&
    message.workflowId === "CHAT"
  ) {
    useChatStore.getState().addMessage(message);
    return;
  }
  if (
    (message.type === "request_credentials" ||
      message.type === "provide_credentials") &&
    "workflowId" in message &&
    message.workflowId === "CHAT"
  ) {
    useChatStore.getState().addMessage(message);
    return;
  }
  if (
    message.type === "workflow_intent_detected" &&
    "suggestedPrompt" in message &&
    "confidence" in message &&
    "reasoning" in message
  ) {
    useChatStore.getState().setIntent({
      messageId: message.id,
      suggestedPrompt: message.suggestedPrompt,
      confidence: message.confidence,
      reasoning: message.reasoning,
    });
    return;
  }
  // Workflow started
  if (
    message.type === "workflow_started" &&
    "workflowId" in message &&
    "prompt" in message
  ) {
    useWorkflowsStore
      .getState()
      .addWorkflow(message.workflowId, message.prompt);
    useWorkflowsStore
      .getState()
      .addMessageToWorkflow(message.workflowId, message);
    useAppStore.getState().setView("workflow-detail", message.workflowId);
    useChatStore.getState().clearIntent();
    return;
  }
  // Other workflow messages
  const workflowId = "workflowId" in message ? message.workflowId : undefined;
  if (workflowId) {
    useWorkflowsStore.getState().addMessageToWorkflow(workflowId, message);
    if (message.type === "final") {
      useWorkflowsStore
        .getState()
        .updateWorkflowStatus(workflowId, "completed");
    } else if (message.type === "error") {
      useWorkflowsStore.getState().updateWorkflowStatus(workflowId, "failed");
    }
    return;
  }
}
