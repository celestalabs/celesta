import "dotenv/config";

import { WebSocketServer, WebSocket } from "ws";
import { WSMessagePipe } from "./io/WSMessagePipe";
import { executeComplexTask } from "./executor";

const PORT = 8080;

// Verify API key is loaded
if (!process.env.GEMINI_API_KEY) {
  console.error("[Server] ERROR: GEMINI_API_KEY environment variable is not set!");
  console.error("[Server] Please check your .env file in packages/playground/");
  process.exit(1);
}

console.log("[Server] API key loaded successfully");

// Store active sessions by client ID
const activeSessions = new Map<string, WSMessagePipe>();

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
  activeSessions.set(clientId, messagePipe);

  // Send welcome message
  messagePipe.send(
    "info",
    `Connected to Celesta server (ID: ${clientId})`,
    "Server"
  );

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
          oldSession.reconnect(ws, false); // Keep pending questions alive
          activeSessions.delete(message.oldClientId);
          activeSessions.set(clientId, oldSession);
          oldSession.send(
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
    activeSessions.delete(clientId);
    messagePipe.close();
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
  for (const [clientId, messagePipe] of activeSessions.entries()) {
    messagePipe.send("info", "Server shutting down", "Server");
    messagePipe.close();
  }
  activeSessions.clear();

  // Close the WebSocket server
  wss.close(() => {
    console.log("[Server] Server closed");
    process.exit(0);
  });
});
