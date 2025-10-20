import { useState, useCallback, useRef } from "react";
import { AppState } from "./types";
import { useChatState } from "./useChatState";
import { useWebSocket, WSMessage } from "./useWebSocket";
import { useWorkflowsState } from "./useWorkflowsState";

export interface UseAppStateOptions {
  websocketUrl: string;
}

export function useAppState({ websocketUrl }: UseAppStateOptions) {
  const [appState, setAppState] = useState<AppState>({
    currentView: "chat",
  });

  const workflowsState = useWorkflowsState();

  // Use refs to store state handlers so they don't cause handleMessage to recreate
  const sendMessageRef = useRef<((message: object) => void) | null>(null);

  const chatState = useChatState({
    onSendMessage: useCallback((content: string) => {
      const message = {
        id: crypto.randomUUID(),
        type: "chat_message",
        content,
        sender: "user",
        timestamp: new Date().toISOString(),
      };
      sendMessageRef.current?.(message);
    }, []),
  });

  // Store refs that get updated on each render
  const workflowsStateRef = useRef(workflowsState);
  const chatStateRef = useRef(chatState);

  // Update refs when state handlers change
  workflowsStateRef.current = workflowsState;
  chatStateRef.current = chatState;

  // Handle incoming WebSocket messages
  const handleMessage = useCallback(
    (message: WSMessage) => {
      // Handle chat-related messages first (no workflowId)
      if (message.type === "chat_response") {
        chatStateRef.current.addAssistantMessage(message.content, message.id);
        return;
      }

      if (
        message.type === "workflow_intent_detected" &&
        "suggestedPrompt" in message &&
        "confidence" in message &&
        "reasoning" in message
      ) {
        chatStateRef.current.setIntent({
          messageId: message.id,
          suggestedPrompt: message.suggestedPrompt,
          confidence: message.confidence,
          reasoning: message.reasoning,
        });
        return;
      }

      // Handle workflow_started specially - it creates the workflow
      if (
        message.type === "workflow_started" &&
        "workflowId" in message &&
        "prompt" in message
      ) {
        // Add workflow to state
        workflowsStateRef.current.addWorkflow(
          message.workflowId,
          message.prompt
        );

        // Add the workflow_started message to the workflow
        workflowsStateRef.current.addMessageToWorkflow(
          message.workflowId,
          message
        );

        // Navigate to the workflow detail view
        setAppState({
          currentView: "workflow-detail",
          selectedWorkflowId: message.workflowId,
        });

        // Clear chat intent
        chatStateRef.current.clearIntent();
        return;
      }

      // Route other workflow messages to their workflow
      const workflowId =
        "workflowId" in message ? message.workflowId : undefined;

      if (workflowId) {
        workflowsStateRef.current.addMessageToWorkflow(workflowId, message);

        // Update workflow status based on final messages
        if (message.type === "final") {
          workflowsStateRef.current.updateWorkflowStatus(
            workflowId,
            "completed"
          );
        } else if (message.type === "error") {
          workflowsStateRef.current.updateWorkflowStatus(workflowId, "failed");
        }
      }
    },
    [] // No dependencies - uses refs for all state access
  );

  const { connected, sendMessage } = useWebSocket({
    url: websocketUrl,
    onMessage: handleMessage,
  });

  // Update the ref when sendMessage is available
  sendMessageRef.current = sendMessage;

  // Navigation functions
  const switchToChat = useCallback(() => {
    setAppState({ currentView: "chat" });
  }, []);

  const switchToWorkflowsList = useCallback(() => {
    setAppState({ currentView: "workflows-list" });
  }, []);

  const focusWorkflow = useCallback((workflowId: string) => {
    setAppState({
      currentView: "workflow-detail",
      selectedWorkflowId: workflowId,
    });
  }, []);

  const backToWorkflowsList = useCallback(() => {
    setAppState({ currentView: "workflows-list" });
  }, []);

  // Start workflow from chat
  const startWorkflow = useCallback(
    (prompt: string) => {
      const message = {
        id: crypto.randomUUID(),
        type: "start_workflow",
        content: `Starting workflow: ${prompt}`,
        sender: "user",
        timestamp: new Date().toISOString(),
        prompt,
      };
      sendMessage(message);
      chatState.clearIntent();
    },
    [sendMessage, chatState]
  );

  // Answer workflow question
  const answerQuestion = useCallback(
    (workflowId: string, answer: string) => {
      const message = {
        id: crypto.randomUUID(),
        type: "answer",
        content: answer,
        sender: "user",
        timestamp: new Date().toISOString(),
        workflowId,
      };
      sendMessage(message);
    },
    [sendMessage]
  );

  // Provide credentials
  const provideCredentials = useCallback(
    (workflowId: string, integrationName: string, accessToken: string) => {
      const message = {
        id: crypto.randomUUID(),
        type: "provide_credentials",
        content: `Providing credentials for ${integrationName}`,
        sender: "user",
        timestamp: new Date().toISOString(),
        workflowId,
        integrationName,
        accessToken,
      };
      sendMessage(message);
    },
    [sendMessage]
  );

  return {
    appState,
    chatState,
    workflowsState,
    connected,
    switchToChat,
    switchToWorkflowsList,
    focusWorkflow,
    backToWorkflowsList,
    startWorkflow,
    answerQuestion,
    provideCredentials,
  };
}
