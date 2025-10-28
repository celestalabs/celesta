import "dotenv/config";

import { WebSocketServer } from "ws";
import { sessionManager } from "./components/sessionManager.js";
import { frontendMessageHandler } from "./components/frontendMessageHandler.js";
import { generateId } from "./utils/generateId.js";
import { logger } from "./utils/logger.js";

const log = logger("server");

const server = new WebSocketServer({
  port: Number(process.env.PORT) || 8081,
});

server.on("connection", async (ws) => {
  const clientId = generateId("CLIENT");

  log(`Client connected: ${clientId}`);

  // register in session manager
  await sessionManager.registerClientId(clientId, ws);

  ws.on("message", (message) => {
    log(`Received raw message from ${clientId}:`, message.toString());

    try {
      frontendMessageHandler(clientId, message);
    } catch (error) {
      log(`Error parsing message from ${clientId}:`, error);
    }
  });

  ws.on("close", () => {
    log(`Client disconnected: ${clientId}`);
  });
});

server.on("listening", () => {
  log("WebSocket server is listening on port", server.options.port);
});
