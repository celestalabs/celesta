import "dotenv/config";

import { createServer } from "http";
import { ChatAgent, CoordinationAgent, toolStore } from "@celesta/agents";
import { browserManager } from "@celesta/browser";
import { generateId, logger } from "@celesta/common";
import {
  ExecuteIntegrationHandler,
  gatherTools,
  GenerateOAuthAccessTokenHandler,
  GenerateOAuthRedirectUrlHandler,
  ListIntegrationsHandler,
} from "@celesta/integrations";
import { sessionManager } from "@celesta/session";
import cors from "cors";
import express from "express";
import { WebSocketServer } from "ws";
import { frontendMessageHandler } from "./frontendMessageHandler.js";
import {
  connectionCodes,
  EstablishConnectionHandler,
} from "./routes/establishConnection.js";
import { WrappedRouter } from "./wrappedRouter.js";

const integrationsServer = express();

integrationsServer.use(express.json());
integrationsServer.use(express.urlencoded({ extended: true }));

integrationsServer.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

integrationsServer.use(
  "/api",
  new WrappedRouter(express.Router())
    .route("post", "/executeIntegration", ExecuteIntegrationHandler)
    .route("post", "/generateOAuthAccessToken", GenerateOAuthAccessTokenHandler)
    .route("get", "/generateOAuthRedirectUrl", GenerateOAuthRedirectUrlHandler)
    .route("get", "/listIntegrations", ListIntegrationsHandler)
    .route("post", "/establishConnection", EstablishConnectionHandler)
    .unwrap()
);

const log = logger("server");

const httpServer = createServer();

// hook up the integrations API server
httpServer.on("request", integrationsServer);

// connect WebSocket server
const agentServer = new WebSocketServer({
  server: httpServer,
});

// Register workflow agent creator so sessionManager can create workflows from chat
sessionManager.registerWorkflowAgentCreator(async (messageContext, prompt) => {
  return new CoordinationAgent({ messageContext, prompt });
});

agentServer.on("connection", async (ws, request) => {
  // Extract connection code from query params
  const url = new URL(request.url!, `http://${request.headers.host}`);
  const code = url.searchParams.get("code");

  if (!code) {
    log("Connection rejected: No connection code provided");
    ws.close(1008, "Connection code required");
    return;
  }

  // Verify the connection code
  const connectionData = connectionCodes.get(code);

  if (!connectionData) {
    log("Connection rejected: Invalid or expired connection code");
    ws.close(1008, "Invalid or expired connection code");
    return;
  }

  // Check if code has expired
  if (connectionData.expiresAt < Date.now()) {
    log("Connection rejected: Connection code expired");
    connectionCodes.delete(code);
    ws.close(1008, "Connection code expired");
    return;
  }

  // Code is valid - consume it (one-time use)
  const userId = connectionData.userId;
  connectionCodes.delete(code);

  const clientId = generateId("CLIENT");

  log(`Client connected: ${clientId} (User: ${userId})`);

  // register in session manager with user ID
  sessionManager.registerClientId(clientId, ws, userId);
  browserManager.registerClientId(clientId);

  gatherTools().then((createTools) => {
    toolStore.registerClientId(clientId, createTools);
    sessionManager.createContext({
      clientId,
      contextId: "CHAT",
      createHandlerAgent: async (messageContext) => {
        const agent = new ChatAgent({ messageContext });
        return agent;
      },
    });
  });

  ws.on("message", (message) => {
    // log(`Received raw message from ${clientId}:`, message.toString());

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

agentServer.on("listening", () => {
  log("WebSocket server is listening on", agentServer.address());
});

httpServer.listen(Number(process.env.PORT) || 8080, () => {
  log("Server is listening on", httpServer.address());
});
