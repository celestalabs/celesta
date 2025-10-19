import { useState, useCallback } from "react";
import type { DisplayMessage } from "../components/MessagePanel";
import type { WSMessage } from "./useWebSocket";

interface UseWorkflowStateOptions {
  onRequestCredentials?: (integrationName: string) => Promise<string | null>;
}

export function useWorkflowState({
  onRequestCredentials,
}: UseWorkflowStateOptions) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [pendingQuestion, setPendingQuestion] = useState<{
    id: string;
    content: string;
  } | null>(null);
  const [pendingCredentialRequest, setPendingCredentialRequest] = useState<{
    id: string;
    integrationName: string;
  } | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [sendMessageFn, setSendMessageFn] = useState<
    ((message: object) => void) | undefined
  >();

  const handleIncomingMessage = useCallback(async (message: WSMessage) => {
    // Create base display message
    const baseMsg = {
      id: message.id || `msg_${Date.now()}`,
      type: message.type,
      content: message.content,
      sender: message.sender,
      timestamp: new Date(message.timestamp || Date.now()),
    };

    // Add type-specific fields based on message type
    let displayMsg: DisplayMessage;

    if (message.type === "tool_invocation") {
      displayMsg = {
        ...baseMsg,
        toolCallId: message.toolCallId,
        toolName: message.toolName,
        toolArgs: message.toolArgs,
      };
    } else if (message.type === "tool_result") {
      displayMsg = {
        ...baseMsg,
        toolCallId: message.toolCallId,
        toolName: message.toolName,
        toolResult: message.toolResult,
      };
    } else {
      displayMsg = baseMsg;
    }

    setMessages((prev) => [...prev, displayMsg]);

    // Handle specific message types
    if (message.type === "question" && message.id) {
      setPendingQuestion({ id: message.id, content: message.content });
    } else if (message.type === "request_credentials") {
      // Don't auto-trigger OAuth - store as pending request
      setPendingCredentialRequest({
        id: message.id,
        integrationName: message.integrationName,
      });
    } else if (message.type === "final") {
      // Workflow finished
      setIsExecuting(false);
    }
  }, []);

  const approveCredentials = useCallback(
    async (id: string, integrationName: string) => {
      if (!onRequestCredentials || !sendMessageFn) return;

      // Trigger OAuth flow
      const accessToken = await onRequestCredentials(integrationName);

      if (accessToken) {
        // Send credentials back
        const response = {
          id,
          type: "provide_credentials",
          integrationName,
          accessToken,
          timestamp: new Date().toISOString(),
        };
        sendMessageFn(response);
      }

      // Clear pending request
      setPendingCredentialRequest(null);
    },
    [onRequestCredentials, sendMessageFn]
  );

  const rejectCredentials = useCallback(
    (id: string, integrationName: string) => {
      if (!sendMessageFn) return;

      // Send error response
      const response = {
        id,
        type: "provide_credentials",
        integrationName,
        accessToken: "", // Empty token signals rejection
        timestamp: new Date().toISOString(),
      };
      sendMessageFn(response);

      // Clear pending request
      setPendingCredentialRequest(null);
    },
    [sendMessageFn]
  );

  const submitAnswer = useCallback(
    (id: string, answer: string) => {
      if (!sendMessageFn) return;

      const message = {
        id,
        type: "answer",
        content: answer,
      };

      sendMessageFn(message);
      setPendingQuestion(null);
    },
    [sendMessageFn]
  );

  const executeWorkflow = useCallback(
    (prompt: string) => {
      if (!sendMessageFn) return;

      setIsExecuting(true); // Start executing

      const message = {
        type: "execute_workflow",
        prompt,
      };

      sendMessageFn(message);
    },
    [sendMessageFn]
  );

  return {
    messages,
    pendingQuestion,
    pendingCredentialRequest,
    isExecuting,
    handleIncomingMessage,
    submitAnswer,
    approveCredentials,
    rejectCredentials,
    executeWorkflow,
    setSendMessage: setSendMessageFn,
  };
}
