import "dotenv/config";

import { WebSocketServer, WebSocket } from "ws";
import { WSMessagePipe } from "./io/WSMessagePipe.js";
import { executeComplexTask } from "./components/executeComplexTask.js";
import { ExecutionContext } from "./components/ExecutionContext.js";
import { ChatAgent, type ChatMessage } from "./agents/ChatAgent.js";
import { loadChatToolsFromAPI } from "./components/dynamicTools.js";
import { ToolSet } from "ai";

const PORT = 8081;
const INTEGRATIONS_API_URL = "http://localhost:8080";

// Verify API key is loaded
if (!process.env.GEMINI_API_KEY) {
  console.error("[Server] ERROR: GEMINI_API_KEY environment variable is not set!");
  console.error("[Server] Please check your .env file in packages/playground/");
  process.exit(1);
}

console.log("[Server] API key loaded successfully");

// Cache for chat tools (loaded on first use, shared across all clients)
let chatToolsCache: ToolSet | undefined;
let chatToolsLoadingPromise: Promise<ToolSet> | undefined;

/**
 * Represents an active workflow execution
 */
interface WorkflowExecution {
  workflowId: string;
  prompt: string;
  executionContext: ExecutionContext | null;
  status: 'running' | 'completed' | 'failed';
  startedAt: Date;
}

/**
 * Represents a client session with multiple workflows and chat history
 */
interface ClientSession {
  clientId: string;
  messagePipe: WSMessagePipe;
  activeWorkflows: Map<string, WorkflowExecution>;
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }>;
}

// Store active sessions by client ID
const activeSessions = new Map<string, ClientSession>();

/**
 * Generate a unique workflow ID
 */
function generateWorkflowId(): string {
  return `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * WebSocket server for Celesta workflow automation framework.
 * Handles client connections and workflow execution requests.
 */
const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (ws: WebSocket) => {
  console.log("[Server] New client connected");

  // Generate a unique client ID
  const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Create a message pipe for this client
  const messagePipe = new WSMessagePipe(ws);
  
  // Create client session
  const session: ClientSession = {
    clientId,
    messagePipe,
    activeWorkflows: new Map(),
    chatHistory: [],
  };
  
  activeSessions.set(clientId, session);

  // Send welcome message
  messagePipe.send(
    "info",
    `Connected to Celesta server (ID: ${clientId})`,
    "Server"
  );

  // Create ChatAgent for this session (tools will be loaded on first message)
  const chatAgent = new ChatAgent({ messagePipe });

  // Handle incoming messages
  ws.on("message", async (data) => {
    try {
      const message = JSON.parse(data.toString());

      // Handle workflow execution request
      if (message.type === "execute_workflow" && message.prompt) {
        console.log(
          `[Server] Executing workflow for client ${clientId}: "${message.prompt}"`
        );

        // Send acknowledgment
        messagePipe.send("info", "Starting workflow execution...", "Server");

        // Execute the workflow
        try {
          await executeComplexTask(message.prompt, messagePipe);
          messagePipe.send(
            "info",
            "Workflow execution completed successfully",
            "Server"
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          messagePipe.send(
            "error",
            `Workflow execution failed: ${errorMessage}`,
            "Server"
          );
          console.error(
            `[Server] Workflow execution error for client ${clientId}:`,
            error
          );
        }
      }
      // Handle reconnection request
      else if (message.type === "reconnect" && message.oldClientId) {
        const oldSession = activeSessions.get(message.oldClientId);
        if (oldSession) {
          console.log(
            `[Server] Reconnecting client ${message.oldClientId} -> ${clientId}`
          );
          oldSession.messagePipe.reconnect(ws, false); // Keep pending questions alive
          activeSessions.delete(message.oldClientId);
          activeSessions.set(clientId, oldSession);
          oldSession.messagePipe.send(
            "info",
            `Reconnected successfully (new ID: ${clientId})`,
            "Server"
          );
        } else {
          messagePipe.send(
            "error",
            `Old session not found: ${message.oldClientId}`,
            "Server"
          );
        }
      }
      // Handle credential provision (OAuth response from frontend)
      else if (message.type === "provide_credentials") {
        // This message is handled by the ExecutionAgent's credential request
        // No need to log or respond - just acknowledge receipt
        console.log(
          `[Server] Received credentials for ${message.integrationName} from client ${clientId}`
        );
      }
      // Handle chat message
      else if (message.type === "chat_message" && message.content) {
        console.log(`[Server] Chat message from client ${clientId}: "${message.content}"`);
        
        const session = activeSessions.get(clientId);
        if (!session) {
          messagePipe.send("error", "Session not found", "Server");
          return;
        }

        // Ensure chat tools are loaded (happens once, cached for all future requests)
        if (!chatToolsCache) {
          if (!chatToolsLoadingPromise) {
            console.log("[Server] Loading chat-compatible tools from integrations API...");
            chatToolsLoadingPromise = loadChatToolsFromAPI(INTEGRATIONS_API_URL, messagePipe)
              .then((tools) => {
                chatToolsCache = tools;
                const toolCount = Object.keys(tools).length;
                console.log(`[Server] Loaded ${toolCount} chat-compatible tools`);
                return tools;
              })
              .catch((error) => {
                console.error("[Server] Failed to load chat tools:", error);
                chatToolsLoadingPromise = undefined; // Reset on error so it can retry
                return {}; // Return empty toolset on error
              });
          }
          
          // Wait for tools to load
          const tools = await chatToolsLoadingPromise;
          chatAgent.setTools(tools);
        } else {
          // Use cached tools
          chatAgent.setTools(chatToolsCache);
        }

        try {
          // Add user message to chat history
          session.chatHistory.push({
            role: "user",
            content: message.content,
            timestamp: new Date(),
          });

          // Check if message is substantial enough for intent detection FIRST
          let shouldSendChatResponse = true;
          
          if (message.content.length >= 20) {
            console.log(`[Server] Detecting workflow intent for message: "${message.content}"`);
            
            const intent = await chatAgent.detectWorkflowIntent(
              message.content,
              session.chatHistory
            );

            console.log(
              `[Server] Intent detection result: needsWorkflow=${intent.needsWorkflow}, confidence=${intent.confidence}`
            );

            // If workflow is detected with high/medium confidence, skip chat response
            if (intent.needsWorkflow && intent.confidence !== "low") {
              shouldSendChatResponse = false;
              
              const intentMessage = {
                id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: "workflow_intent_detected",
                content: `I can help you with that using a workflow. ${intent.reasoning}`,
                sender: "System",
                timestamp: new Date(),
                suggestedPrompt: intent.suggestedPrompt || message.content,
                confidence: intent.confidence,
                reasoning: intent.reasoning,
              };

              // Send via raw WebSocket to include all fields
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(intentMessage));
              }

              console.log(
                `[Server] Sent workflow intent detection to client ${clientId}`
              );
            }
          }

          // Only generate and send chat response if no workflow was detected
          if (shouldSendChatResponse) {
            // Generate response
            const response = await chatAgent.handleMessage(
              message.content,
              session.chatHistory
            );

            // Add assistant response to chat history
            session.chatHistory.push({
              role: "assistant",
              content: response,
              timestamp: new Date(),
            });

            // Send response to client
            messagePipe.send("chat_response", response, "ChatAgent");
            console.log(`[Server] Sent chat response to client ${clientId}`);
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`[Server] Chat error for client ${clientId}:`, error);
          messagePipe.send("error", `Chat error: ${errorMsg}`, "Server");
        }
      }
      // Handle workflow start request
      else if (message.type === "start_workflow" && message.prompt) {
        console.log(
          `[Server] Starting workflow for client ${clientId}: "${message.prompt}"`
        );

        const session = activeSessions.get(clientId);
        if (!session) {
          messagePipe.send("error", "Session not found", "Server");
          return;
        }

        try {
          // Generate unique workflow ID
          const workflowId = generateWorkflowId();

          // Generate context from chat history
          const chatContext = await chatAgent.generateWorkflowContext(
            session.chatHistory,
            message.prompt
          );

          console.log(
            `[Server] Generated workflow context: "${chatContext || "none"}"`
          );

          // Send workflow_started message with navigation button
          const workflowStartedMessage = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: "workflow_started",
            content: `Started workflow: ${message.prompt}`,
            sender: "System",
            timestamp: new Date(),
            workflowId,
            prompt: message.prompt,
            hasNavButton: true,
          };

          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(workflowStartedMessage));
          }

          // Create workflow execution record
          const workflowExecution: WorkflowExecution = {
            workflowId,
            prompt: message.prompt,
            executionContext: null, // Will be set during execution
            status: "running",
            startedAt: new Date(),
          };

          session.activeWorkflows.set(workflowId, workflowExecution);

          // Execute the workflow with context
          executeComplexTask(
            message.prompt,
            messagePipe,
            "http://localhost:8080",
            workflowId,
            chatContext || undefined
          )
            .then(() => {
              // Mark workflow as completed
              const workflow = session.activeWorkflows.get(workflowId);
              if (workflow) {
                workflow.status = "completed";
              }
              console.log(`[Server] Workflow ${workflowId} completed successfully`);
            })
            .catch((error) => {
              // Mark workflow as failed
              const workflow = session.activeWorkflows.get(workflowId);
              if (workflow) {
                workflow.status = "failed";
              }
              const errorMsg = error instanceof Error ? error.message : String(error);
              console.error(`[Server] Workflow ${workflowId} failed:`, error);
              messagePipe.send(
                "error",
                `Workflow execution failed: ${errorMsg}`,
                "Server",
                workflowId
              );
            });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(
            `[Server] Error starting workflow for client ${clientId}:`,
            error
          );
          messagePipe.send("error", `Failed to start workflow: ${errorMsg}`, "Server");
        }
      }
      // Unknown message type
      else {
        messagePipe.send(
          "error",
          `Unknown message type or missing required fields`,
          "Server"
        );
      }
    } catch (error) {
      console.error(
        `[Server] Error processing message from client ${clientId}:`,
        error
      );
      messagePipe.send("error", "Failed to process message", "Server");
    }
  });

  // Handle client disconnect
  ws.on("close", () => {
    console.log(`[Server] Client ${clientId} disconnected`);
    const session = activeSessions.get(clientId);
    if (session) {
      session.messagePipe.close();
      activeSessions.delete(clientId);
    }
  });

  // Handle errors
  ws.on("error", (error) => {
    console.error(`[Server] WebSocket error for client ${clientId}:`, error);
    activeSessions.delete(clientId);
  });
});

console.log(
  `[Server] Celesta WebSocket server running on ws://localhost:${PORT}`
);
console.log(`[Server] Waiting for client connections...`);

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n[Server] Shutting down...");

  // Close all active sessions
  for (const [clientId, session] of activeSessions.entries()) {
    session.messagePipe.send("info", "Server shutting down", "Server");
    session.messagePipe.close();
  }
  activeSessions.clear();

  // Close the WebSocket server
  wss.close(() => {
    console.log("[Server] Server closed");
    process.exit(0);
  });
});
