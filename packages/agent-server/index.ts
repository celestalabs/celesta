import "dotenv/config";

import { WebSocketServer } from "ws";
import { logger } from "./utils/logger.js";
import { generateId } from "./utils/generateId.js";

const log = logger("server");

const server = new WebSocketServer({
  port: Number(process.env.PORT) || 8081,
});

server.on("connection", (ws) => {
  const clientId = generateId("CLIENT");

  log(`Client connected: ${clientId}`);

  ws.on("message", (message) => {
    log(`Received message from ${clientId}:`, message.toString());

    try {
      const parsedMessage: object = JSON.parse(message.toString());
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