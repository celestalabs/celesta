import useWebSocket from "react-use-websocket";
import { FrontendWSMessage, ServerWSMessage, WSMessage } from "@celesta/types";
import { useStore } from "../store";

// Map each ServerWSMessage type to its specific message shape
type ServerWSMessageByType = {
  [K in ServerWSMessage["type"]]: Extract<ServerWSMessage, { type: K }>;
};

export function useAgentServer(handlerByType: {
  [K in keyof ServerWSMessageByType]: (
    message: ServerWSMessageByType[K],
    send: (message: FrontendWSMessage) => void
  ) => void;
}) {
  const store = useStore((store) => store);

  const handleOpen = useCallback(() => {
    console.log("WebSocket connection opened");
  }, []);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      const ws = event.target as WebSocket;
      const send = (ms: FrontendWSMessage) => ws.send(JSON.stringify(ms));

      const message: ServerWSMessage = JSON.parse(event.data);
      console.log(message);

      if (message.type === "CONTEXT_CREATED") {
        store.addContext(message.contextId);
      } else if ("contextId" in message) {
        store.addMessageToContext(message);
      }

      const handler =
        handlerByType[message.type as keyof ServerWSMessageByType];
      if (handler) {
        handler(message as any, send);
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
    (message: FrontendWSMessage) => {
      sendJsonMessage(message);
      if ("contextId" in message) {
        store.addMessageToContext(message);
      }
    },
    [sendJsonMessage]
  );

  return {
    sendMessage,
  };
}
