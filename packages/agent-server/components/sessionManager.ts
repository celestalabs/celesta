/**
 * SessionManager handles client registration, credential management,
 * WebSocket communication, and request/response tracking for agent-server.
 */

import { IntegrationName } from "@celesta/integrations-api/integrations/integrationName.js";
import { WebSocket } from "ws";
import {
  ClientId,
  ContextId,
  IncomingWSResponseMessage,
  IncomingWSUserMessage,
  OutgoingWSMessage,
  RequestId,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import { createMessageContext, MessageContext } from "./messageContext.js";

const log = logger("sessionManager");

/**
 * Manages sessions, credentials, and WebSocket messaging for clients.
 */
class SessionManager {
  // Maps client IDs to their credentials per integration
  credentials: Map<ClientId, Map<IntegrationName, string>> = new Map();

  // Maps client IDs to their WebSocket connections
  sockets: Map<ClientId, WebSocket> = new Map();

  // Tracks pending requests awaiting responses per client
  pendingRequests: Map<
    ClientId,
    Map<RequestId, (message: IncomingWSResponseMessage) => void>
  > = new Map();

  // Tracks active message contexts per client
  messageContexts: Map<ClientId, Map<ContextId, MessageContext>> = new Map();

  /**
   * Registers a new client with its WebSocket connection.
   */
  registerClientId(clientId: ClientId, ws: WebSocket) {
    if (!this.credentials.has(clientId)) {
      this.sockets.set(clientId, ws);
      this.credentials.set(clientId, new Map());
      this.pendingRequests.set(clientId, new Map());
      this.messageContexts.set(clientId, new Map());

      // chat context
      this.messageContexts
        .get(clientId)
        ?.set("CHAT", createMessageContext(clientId, "CHAT"));
    } else {
      log(`Client ID ${clientId} is already registered.`);
    }
  }

  /**
   * Sends a message to the specified client via WebSocket.
   * Returns true if successful, false otherwise.
   */
  sendMessage(clientId: ClientId, message: OutgoingWSMessage): boolean {
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
  ): Promise<IncomingWSResponseMessage> {
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
    message: IncomingWSResponseMessage
  ) {
    this.pendingRequests.get(clientId)?.get(requestId)?.(message);
  }

  /**
   * Route user incoming messages to the right message context
   */
  routeUserMessage(clientId: ClientId, message: IncomingWSUserMessage) {
    const context = this.messageContexts.get(clientId)?.get(message.context);
    context?.handleIncomingMessage(message);
  }
}

// singleton
export const sessionManager = new SessionManager();
