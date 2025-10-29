import "dotenv/config";

import { createServer } from "http";
import { ChatAgent } from "@celesta/agents";
import { generateId, logger } from "@celesta/common";
import {
  ExecuteIntegrationHandler,
  GenerateOAuthAccessTokenHandler,
  GenerateOAuthRedirectUrlHandler,
  ListIntegrationsHandler,
} from "@celesta/integrations";
import { sessionManager } from "@celesta/session";
import cors from "cors";
import express from "express";
import { WebSocketServer } from "ws";
import { frontendMessageHandler } from "./components/frontendMessageHandler.js";
import {} from "@celesta/common";
import { WrappedRouter } from "./utils/wrappedRouter.js";

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

agentServer.on("connection", async (ws) => {
  const clientId = generateId("CLIENT");

  log(`Client connected: ${clientId}`);

  // register in session manager
  await sessionManager.registerClientId(clientId, ws);
  sessionManager.createContext(clientId, "CHAT", (ctx) => new ChatAgent(ctx));

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

agentServer.on("listening", () => {
  log("WebSocket server is listening on", agentServer.address());
});

httpServer.listen(Number(process.env.PORT) || 8080, () => {
  log("Server is listening on", httpServer.address());
});
