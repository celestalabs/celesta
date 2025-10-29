/**
 * SessionManager handles client registration, credential management,
 * WebSocket communication, and request/response tracking for agent-server.
 */

import { ListIntegrationsHandler } from "@celesta/integrations";
import { IntegrationName } from "@celesta/integrations/integrations/integrationName.js";
import {
  RequestId,
  ClientId,
  ContextId,
  FrontendWSResponseMessage,
  FrontendWSUserMessage,
  ServerWSMessage,
  ts,
} from "@celesta/types";
import { WebSocket } from "ws";
import { ChatAgent } from "../agents/ChatAgent.js";
import { logger } from "../utils/logger.js";
import {
  createMessageContext,
  HandlerAgentCreator,
  MessageContext,
} from "./messageContext.js";

const log = logger("sessionManager");

/**
 * Manages sessions, credentials, and WebSocket messaging for clients.
 */

type Integrations = Extract<
  Awaited<ReturnType<ListIntegrationsHandler>>,
  { success: true }
>["integrations"];

class SessionManager {
  // Maps client IDs to their credentials per integration
  credentials: Map<ClientId, Map<IntegrationName, string>> = new Map();

  // Maps client IDs to the tools they have available
  tools: Map<ClientId, Integrations> = new Map();

  // Maps client IDs to their WebSocket connections
  sockets: Map<ClientId, WebSocket> = new Map();

  // Tracks pending requests awaiting responses per client
  pendingRequests: Map<
    ClientId,
    Map<RequestId, (message: FrontendWSResponseMessage) => void>
  > = new Map();

  // Tracks active message contexts per client
  messageContexts: Map<ClientId, Map<ContextId, MessageContext>> = new Map();

  /**
   * Creates a new message context for the specified client.
   */
  async createContext(
    clientId: ClientId,
    contextId: ContextId,
    createHandlerAgent: HandlerAgentCreator
  ) {
    this.messageContexts
      .get(clientId)
      ?.set(
        contextId,
        createMessageContext(clientId, contextId, createHandlerAgent)
      );
    log(`Created context ${contextId} for client ${clientId}.`);

    this.sendMessage(
      clientId,
      ts({
        type: "CONTEXT_CREATED",
        contextId,
      })
    );
  }

  /**
   * Registers a new client with its WebSocket connection.
   */
  async registerClientId(clientId: ClientId, ws: WebSocket) {
    if (!this.credentials.has(clientId)) {
      this.sockets.set(clientId, ws);
      this.credentials.set(clientId, new Map());
      this.pendingRequests.set(clientId, new Map());
      this.messageContexts.set(clientId, new Map());

      const toolResponse = await ListIntegrationsHandler({
        params: { mode: "all" },
      });

      if (toolResponse.success) {
        this.tools.set(clientId, toolResponse.integrations);
      } else {
        this.tools.set(clientId, {} as Integrations);
      }

      // chat context
      this.createContext(clientId, "CHAT", (ctx) => new ChatAgent(ctx));
    } else {
      log(`Client ID ${clientId} is already registered.`);
    }
  }

  /**
   * Sends a message to the specified client via WebSocket.
   * Returns true if successful, false otherwise.
   */
  sendMessage(clientId: ClientId, message: ServerWSMessage): boolean {
    const ws = this.sockets.get(clientId);
    if (ws && ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(message));
      return true;
    } else {
      log(`WebSocket for client ID ${clientId} is not open.`);
      return false;
    }
  }

  /**
   * Waits for a response to a specific request from a client.
   * Rejects if timeout occurs.
   */
  async expectResponse(
    clientId: ClientId,
    requestId: RequestId
  ): Promise<FrontendWSResponseMessage> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => {
          this.pendingRequests.get(clientId)?.delete(requestId);
          reject(
            new Error(`Timeout waiting for response to request ${requestId}`)
          );
        },
        5 * 60 * 1000
      ); // 5 minutes timeout

      this.pendingRequests.get(clientId)?.set(requestId, (message) => {
        clearTimeout(timeout);
        this.pendingRequests.get(clientId)?.delete(requestId);
        resolve(message);
      });
    });
  }

  /**
   * Handle receipt of any pending requests
   */
  async triggerRequestResponse(
    clientId: ClientId,
    requestId: RequestId,
    message: FrontendWSResponseMessage
  ) {
    this.pendingRequests.get(clientId)?.get(requestId)?.(message);
  }

  /**
   * Route user frontend messages to the right message context
   */
  routeUserMessage(clientId: ClientId, message: FrontendWSUserMessage) {
    const context = this.messageContexts.get(clientId)?.get(message.contextId);
    if (context == null) {
      log("no context to handle message");
      return;
    }
    context.handleFrontendUserMessage(message);
  }
}

// singleton
export const sessionManager = new SessionManager();
