import { useState, useCallback } from "react";
import { PendingIntent } from "./types";
import { WSMessage } from "./useWebSocket";

export interface UseChatStateOptions {
  onSendMessage: (content: string) => void;
}

export function useChatState({ onSendMessage }: UseChatStateOptions) {
  const [messages, setMessages] = useState<WSMessage[]>([]);
  const [pendingIntent, setPendingIntent] = useState<PendingIntent | null>(
    null
  );
  const [pendingCredentialRequest, setPendingCredentialRequest] = useState<{
    messageId: string;
    integrationName: string;
  } | null>(null);

  const addUserMessage = useCallback(
    (content: string) => {
      const message: WSMessage = {
        id: crypto.randomUUID(),
        type: "chat_message",
        content,
        sender: "user",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, message]);
      onSendMessage(content);
    },
    [onSendMessage]
  );

  const addAssistantMessage = useCallback((content: string, id?: string) => {
    const message: WSMessage = {
      id: id || crypto.randomUUID(),
      type: "chat_response",
      content,
      sender: "assistant",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, message]);
  }, []);

  const addMessage = useCallback((message: WSMessage) => {
    setMessages((prev) => [...prev, message]);
    
    // Handle credential requests
    if (message.type === "request_credentials" && "integrationName" in message) {
      setPendingCredentialRequest({
        messageId: message.id,
        integrationName: message.integrationName,
      });
    } else if (message.type === "provide_credentials") {
      setPendingCredentialRequest(null);
    }
  }, []);

  const setIntent = useCallback((intent: PendingIntent | null) => {
    setPendingIntent(intent);
  }, []);

  const clearIntent = useCallback(() => {
    setPendingIntent(null);
  }, []);

  return {
    messages,
    pendingIntent,
    pendingCredentialRequest,
    addUserMessage,
    addAssistantMessage,
    addMessage,
    setIntent,
    clearIntent,
  };
}
