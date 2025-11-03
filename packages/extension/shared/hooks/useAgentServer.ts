import {
  type BrowserAgentId,
  type FrontendWSMessage,
  isBrowserAgentId,
  logger,
  type ServerWSMessage,
} from "@celesta/common";
import useWebSocket from "react-use-websocket";
import { useStore } from "../store";
import { attachDebugger } from "../utils/browserAgentActions";
import {
  sendWebMessage,
  type AgentActionWebMessage,
} from "../utils/webMessages";

const log = logger("useAgentServer");

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
  const addContext = useStore((store) => store.addContext);
  const addMessageToContext = useStore((store) => store.addMessageToContext);

  const createWorkflow = useStore((store) => store.createWorkflow);
  const updateWorkflowStatus = useStore((store) => store.updateWorkflowStatus);

  const createWorkflowTask = useStore((store) => store.createWorkflowTask);
  const updateWorkflowTaskStatus = useStore(
    (store) => store.updateWorkflowTaskStatus
  );

  const tabIdByBrowserAgent = useStore((state) => state.tabIdByBrowserAgent);
  const addBrowserAgentTabId = useStore((state) => state.addBrowserAgentTabId);
  const addBrowserAgentToolId = useStore(
    (state) => state.addBrowserAgentToolId
  );

  const handleOpen = useCallback(() => {
    log("WebSocket connection opened");
  }, []);

  const handleMessage = useCallback(
    async (event: MessageEvent) => {
      const ws = event.target as WebSocket;
      const send = (ms: FrontendWSMessage) => ws.send(JSON.stringify(ms));

      const message: ServerWSMessage = JSON.parse(event.data);
      log(message);

      // State management based on message type
      switch (message.type) {
        case "CONTEXT_CREATED": {
          addContext(message.contextId);

          if (isBrowserAgentId(message.contextId)) {
            log("Browser agent context created: " + message.contextId);

            const { id } = await browser.tabs.create({
              url: "https://google.com",
            });

            addBrowserAgentTabId(message.contextId, id!);
            await sendWebMessage(
              ["tabs", id!],
              {
                __isWebMessage: true,
                __webMessageType: "AgentActionWebMessage",
                action: "startAgent",
              } satisfies AgentActionWebMessage,
              false
            );
            await attachDebugger(id!);
          }

          break;
        }
        case "WORKFLOW_STATUS_CHANGED": {
          if (message.status === "running") {
            createWorkflow({
              workflowId: message.workflowId,
              status: message.status,
              prompt: message.prompt,
            });
          } else {
            updateWorkflowStatus(message.workflowId, message.status);
          }
          break;
        }
        case "WORKFLOW_TASK_STATUS_CHANGED": {
          if (message.status === "pending") {
            createWorkflowTask(message.workflowId, {
              type: "UI_WORKFLOW_TASK",
              slug: message.slug,
              status: message.status,
              description: message.description,
              timestamp: message.timestamp,
            });
          } else {
            updateWorkflowTaskStatus(
              message.workflowId,
              message.slug,
              message.status
            );
          }

          break;
        }
        case "BROWSER_AGENT_INITIALIZED": {
          addBrowserAgentToolId(message.toolCallId, message.browserAgentId);
          break;
        }
        case "REQUEST_BROWSER_AGENT_ACTION": {
          const id = tabIdByBrowserAgent[message.contextId as BrowserAgentId];
          await sendWebMessage(
            ["tabs", id!],
            {
              __isWebMessage: true,
              __webMessageType: "AgentActionWebMessage",
              action: "startAgent",
            } satisfies AgentActionWebMessage,
            false
          );
        }
      }

      // Add message to context if applicable (for display)
      if ("contextId" in message) {
        addMessageToContext(message);
      }

      const handler =
        handlerByType[message.type as keyof ServerWSMessageByType];
      if (handler) {
        handler(message as any, send);
      } else {
        console.warn(`No handler for message type: ${message.type}`);
      }
    },
    [
      handlerByType,
      addContext,
      addMessageToContext,
      createWorkflow,
      updateWorkflowStatus,
      createWorkflowTask,
      updateWorkflowTaskStatus,
      addBrowserAgentTabId,
      addBrowserAgentToolId,
      tabIdByBrowserAgent,
    ]
  );

  const { sendJsonMessage } = useWebSocket(
    import.meta.env.VITE_AGENT_SERVER_WS_URL || "",
    {
      onOpen: handleOpen,
      onMessage: handleMessage,
    }
  );

  const sendMessage = useCallback(
    (message: FrontendWSMessage) => {
      sendJsonMessage(message);
      if ("contextId" in message) {
        addMessageToContext(message);
      }
    },
    [sendJsonMessage, addMessageToContext]
  );

  return {
    sendMessage,
  };
}
