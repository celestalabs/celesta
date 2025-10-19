import { useState, useEffect, useCallback, useRef } from "react";

export interface WSMessage {
  id?: string;
  type: string;
  content: string;
  sender: string;
  timestamp: string;
  integrationName?: string;
  accessToken?: string;
  isQuestion?: boolean;
}

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
