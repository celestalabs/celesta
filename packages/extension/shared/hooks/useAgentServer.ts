import useWebSocket from "react-use-websocket";
import { FrontendWSMessage, ServerWSMessage, WSMessage } from "@celesta/types";

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
  const [messages, setMessages] = useState<WSMessage[]>([]);

  const handleOpen = useCallback(() => {
    console.log("WebSocket connection opened");
  }, []);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      const ws = event.target as WebSocket;
      const send = (ms: FrontendWSMessage) => ws.send(JSON.stringify(ms));

      const message: ServerWSMessage = JSON.parse(event.data);
      const handler =
        handlerByType[message.type as keyof ServerWSMessageByType];
      if (handler) {
        // TypeScript can't fully narrow here, so cast for safety
        setMessages((prev) => [...prev, message]);
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
      setMessages((prev) => [...prev, message]);
      sendJsonMessage(message);
    },
    [sendJsonMessage]
  );

  return {
    sendMessage,
    messages,
  };
}
