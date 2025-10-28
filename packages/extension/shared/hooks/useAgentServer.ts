import { IncomingWSMessage, OutgoingWSMessage } from "@celesta/types";

// Map each OutgoingWSMessage type to its specific message shape
type OutgoingWSMessageByType = {
  [K in OutgoingWSMessage["type"]]: Extract<OutgoingWSMessage, { type: K }>;
};
import useWebSocket from "react-use-websocket";

export function useAgentServer(
  handlerByType: {
    [K in keyof OutgoingWSMessageByType]: (message: OutgoingWSMessageByType[K]) => void;
  }
) {
  const handleOpen = useCallback(() => {
    console.log("WebSocket connection opened");
  }, []);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      const message: OutgoingWSMessage = JSON.parse(event.data);
      const handler = handlerByType[message.type as keyof OutgoingWSMessageByType];
      if (handler) {
        // TypeScript can't fully narrow here, so cast for safety
        handler(message as any);
      } else {
        console.warn(`No handler for message type: ${message.type}`);
      }
    },
    [handlerByType]
  );

  const { sendJsonMessage } = useWebSocket(
    import.meta.env.VITE_AGENT_SERVER_URL || "",
    {
      onOpen: handleOpen,
      onMessage: handleMessage,
    }
  );

  const sendMessage = useCallback(
    (message: IncomingWSMessage) => {
      sendJsonMessage(message);
    },
    [sendJsonMessage]
  );

  return {
    sendMessage,
  };
}
