import { useState, useEffect, useCallback, useRef } from "react";

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

export interface UseWebSocketOptions {
  url: string;
  onMessage?: (message: WSMessage) => void | Promise<void>;
}

export function useWebSocket({ url, onMessage }: UseWebSocketOptions) {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const onMessageRef = useRef(onMessage);

  // Update ref when onMessage changes
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    const websocket = new WebSocket(url);

    websocket.onopen = () => {
      console.log("WebSocket connected");
      setConnected(true);
      setWs(websocket);
    };

    websocket.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        onMessageRef.current?.(message);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    websocket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    websocket.onclose = () => {
      console.log("WebSocket disconnected");
      setConnected(false);
      setWs(null);
    };

    return () => {
      websocket.close();
    };
  }, [url]);

  const sendMessage = useCallback(
    (message: object) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    },
    [ws]
  );

  return {
    ws,
    connected,
    sendMessage,
  };
}
