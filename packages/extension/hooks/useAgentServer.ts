import {
  type BrowserAgentId,
  type FrontendWSMessage,
  logger,
  type ServerWSMessage,
  ts,
} from "@celesta/common";
import useWebSocket from "react-use-websocket";
import { useStore } from "../store";
import { apiClient } from "../utils/apiClient";
import { attachDebugger } from "../utils/browserAgentActions";
import { supabase } from "../utils/supabase";
import {
  sendWebMessage,
  type AgentActionWebMessage,
} from "../utils/webMessages";

const log = logger("useAgentServer");

// Storage key for pending prompt from context menu (must match background.ts)
const PENDING_PROMPT_KEY = "pendingPrompt";
// Max age for pending prompt (5 seconds)
const MAX_PROMPT_AGE_MS = 5000;

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

  const addIncomingMessagePart = useStore(
    (store) => store.addIncomingMessagePart
  );

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

  const tabIdByWorkflow = useStore((state) => state.tabIdByWorkflow);
  const setWorkflowTabId = useStore((state) => state.setWorkflowTabId);

  // Voice event dispatchers
  const dispatchVoiceTranscript = useStore(
    (state) => state.dispatchVoiceTranscript
  );
  const dispatchVoiceTTSChunk = useStore(
    (state) => state.dispatchVoiceTTSChunk
  );
  const dispatchVoiceTTSComplete = useStore(
    (state) => state.dispatchVoiceTTSComplete
  );
  const dispatchVoiceError = useStore((state) => state.dispatchVoiceError);

  // Track when CHAT context has been created (for pending prompt handling)
  const [chatContextCreated, setChatContextCreated] = useState(false);

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

          // When CHAT context is created, check for pending prompt from context menu
          if (message.contextId === "CHAT") {
            const result =
              await browser.storage.session.get(PENDING_PROMPT_KEY);
            const stored = result[PENDING_PROMPT_KEY] as
              | { prompt: string; timestamp: number }
              | undefined;

            if (stored && Date.now() - stored.timestamp < MAX_PROMPT_AGE_MS) {
              log(`Sending pending prompt: "${stored.prompt.slice(0, 50)}..."`);
              const pendingMessage = ts({
                type: "USER_MESSAGE" as const,
                data: { role: "user" as const, content: stored.prompt },
                contextId: "CHAT" as const,
              });
              send(pendingMessage);
              addMessageToContext(pendingMessage);
            }

            // Always clear storage after checking
            await browser.storage.session.remove(PENDING_PROMPT_KEY);

            // Mark chat context as created so storage listener can handle future prompts
            setChatContextCreated(true);
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

          // Priority for tab reuse:
          // 1. Check if this workflow already has a tab (for multi-step browser workflows)
          // 2. Use existingTabId if provided
          // 3. Create a new tab
          let tabId: number | undefined;

          // Check workflow tab first (highest priority for reuse within same workflow)
          if (
            message.workflowId &&
            tabIdByWorkflow[message.workflowId] != null
          ) {
            try {
              await browser.tabs.get(tabIdByWorkflow[message.workflowId]!);
              tabId = tabIdByWorkflow[message.workflowId]!;
              log(
                `Reusing workflow tab ${tabId} for browser agent ${message.browserAgentId} in workflow ${message.workflowId}`
              );
            } catch {
              log(
                `Workflow tab ${tabIdByWorkflow[message.workflowId]} no longer exists`
              );
            }
          }

          // Fall back to existingTabId if no workflow tab
          if (tabId == null && message.existingTabId != null) {
            try {
              await browser.tabs.get(message.existingTabId);
              tabId = message.existingTabId;
              log(
                `Reusing existing tab ${tabId} for browser agent ${message.browserAgentId}`
              );
            } catch {
              log(`Existing tab ${message.existingTabId} not found`);
            }
          }

          // Create new tab if needed
          if (tabId == null) {
            log(`Creating new tab for browser agent ${message.browserAgentId}`);
            const { id } = await browser.tabs.create({
              url: "https://google.com",
            });
            tabId = id!;
          }

          addBrowserAgentTabId(message.browserAgentId, tabId);

          // Track by workflow if applicable (so subsequent browser tasks reuse this tab)
          if (message.workflowId) {
            setWorkflowTabId(message.workflowId, tabId);
          }

          await sendWebMessage(
            ["tabs", tabId],
            {
              __isWebMessage: true,
              __webMessageType: "AgentActionWebMessage",
              action: "startAgent",
            } satisfies AgentActionWebMessage,
            false
          );
          await attachDebugger(tabId);
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
          break;
        }
        // Voice message handlers - dispatch to store for AssistantView to consume
        case "VOICE_TRANSCRIPT": {
          dispatchVoiceTranscript(message.transcript, message.isFinal);
          break;
        }
        case "VOICE_TTS_CHUNK": {
          dispatchVoiceTTSChunk(message.audioData);
          break;
        }
        case "VOICE_TTS_COMPLETE": {
          dispatchVoiceTTSComplete();
          break;
        }
        case "VOICE_ERROR": {
          dispatchVoiceError(message.error);
          break;
        }
      }

      // Add message to context if applicable (for display)
      if ("contextId" in message) {
        if (message.type === "AGENT_MESSAGE" && message.stream) {
          // Streamed messages are handled differently
          addIncomingMessagePart(message.contextId, message);
        } else {
          addMessageToContext(message);
        }
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
      addIncomingMessagePart,
      createWorkflow,
      updateWorkflowStatus,
      createWorkflowTask,
      updateWorkflowTaskStatus,
      addBrowserAgentTabId,
      addBrowserAgentToolId,
      tabIdByBrowserAgent,
      tabIdByWorkflow,
      setWorkflowTabId,
      dispatchVoiceTranscript,
      dispatchVoiceTTSChunk,
      dispatchVoiceTTSComplete,
      dispatchVoiceError,
    ]
  );

  // Get connection code via HTTP, then connect to WebSocket
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Monitor auth state changes
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setAuthToken(session?.access_token || null);
    };

    checkAuth();

    // Listen for auth changes (sign in, sign up, sign out)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      log("Auth state changed:", event);
      setAuthToken(session?.access_token || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Establish connection when auth token is available
  useEffect(() => {
    if (!authToken) {
      setWsUrl(null);
      return;
    }

    const setupWebSocket = async () => {
      try {
        // Step 1: Request connection code from server using typed client
        const response = await apiClient.establishConnection({
          headers: { authorization: `Bearer ${authToken}` },
        });

        if (!response.success) {
          log("Failed to establish connection:", response.error);
          return;
        }

        // Step 2: Connect to WebSocket with the connection code
        const wsUrl = import.meta.env.VITE_AGENT_SERVER_WS_URL;
        if (!wsUrl) {
          log("VITE_AGENT_SERVER_WS_URL not configured");
          return;
        }

        const url = new URL(wsUrl);
        url.searchParams.set("code", response.connectionCode);
        setWsUrl(url.toString());

        log("Connection code obtained, connecting to WebSocket...");
      } catch (error) {
        log("Error establishing connection:", error);
      }
    };

    setupWebSocket();
  }, [authToken]);

  const { sendJsonMessage } = useWebSocket(
    wsUrl,
    {
      onOpen: handleOpen,
      onMessage: handleMessage,
    },
    wsUrl !== null // Only connect when we have the authenticated URL
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

  // Listen for pending prompts from context menu (when sidebar is already open)
  useEffect(() => {
    if (!chatContextCreated) return; // Only listen after CHAT context is created

    const handleStorageChange = (
      changes: { [key: string]: Browser.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName !== "session" || !changes[PENDING_PROMPT_KEY]?.newValue)
        return;

      const stored = changes[PENDING_PROMPT_KEY].newValue as {
        prompt: string;
        timestamp: number;
      };

      if (Date.now() - stored.timestamp < MAX_PROMPT_AGE_MS) {
        log(
          `Storage change: sending pending prompt: "${stored.prompt.slice(0, 50)}..."`
        );
        const pendingMessage = ts({
          type: "USER_MESSAGE" as const,
          data: { role: "user" as const, content: stored.prompt },
          contextId: "CHAT" as const,
        });
        sendJsonMessage(pendingMessage);
        addMessageToContext(pendingMessage);

        // Clear storage after processing
        browser.storage.session.remove(PENDING_PROMPT_KEY);
      }
    };

    browser.storage.onChanged.addListener(handleStorageChange);
    return () => browser.storage.onChanged.removeListener(handleStorageChange);
  }, [chatContextCreated, sendJsonMessage, addMessageToContext]);

  return {
    sendMessage,
  };
}
