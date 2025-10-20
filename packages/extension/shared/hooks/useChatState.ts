import { useState, useCallback } from "react";
import { ChatMessage, PendingIntent } from "./types";

export interface UseChatStateOptions {
  onSendMessage: (content: string) => void;
}

export function useChatState({ onSendMessage }: UseChatStateOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingIntent, setPendingIntent] = useState<PendingIntent | null>(
    null
  );

  const addUserMessage = useCallback(
    (content: string) => {
      const message: ChatMessage = {
        id: crypto.randomUUID(),
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
    const message: ChatMessage = {
      id: id || crypto.randomUUID(),
      content,
      sender: "assistant",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, message]);
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
    addUserMessage,
    addAssistantMessage,
    setIntent,
    clearIntent,
  };
}
