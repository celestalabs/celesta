/**
 * SessionManager handles client registration, credential management,
 * WebSocket communication, and request/response tracking for agent-server.
 */

import { IntegrationName } from "@celesta/integrations-api/integrations/integrationName.js";
import {
  ClientId,
  ContextId,
  IncomingWSResponseMessage,
  OutgoingWSMessage,
  RequestId,
} from "../types/index.js";
import { WebSocket } from "ws";
import { logger } from "../utils/logger.js";
import { generateId } from "../utils/generateId.js";

const log = logger("sessionManager");

/**
 * Manages sessions, credentials, and WebSocket messaging for clients.
 */
class SessionManager {
  // Maps client IDs to their credentials per integration
  private credentials: Map<ClientId, Map<IntegrationName, string>> = new Map();

  // Maps client IDs to their WebSocket connections
  private sockets: Map<ClientId, WebSocket> = new Map();

  // Tracks pending requests awaiting responses per client
  private pendingRequests: Map<
    ClientId,
    Map<RequestId, (message: IncomingWSResponseMessage) => void>
  > = new Map();

  /**
   * Registers a new client with its WebSocket connection.
   */
  registerClientId(clientId: ClientId, ws: WebSocket) {
    if (!this.credentials.has(clientId)) {
      this.credentials.set(clientId, new Map());
      this.sockets.set(clientId, ws);
    } else {
      log(`Client ID ${clientId} is already registered.`);
    }
  }

  /**
   * Sends a message to the specified client via WebSocket.
   * Returns true if successful, false otherwise.
   */
  private sendMessage(clientId: ClientId, message: OutgoingWSMessage): boolean {
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
  private async expectResponse(
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
   * Retrieves credentials for a client and integration.
   * Requests credentials from client if not cached.
   */
  async retrieveCredentials(
    clientId: ClientId,
    integrationName: IntegrationName
  ): Promise<string> {
    const clientCredentials = this.credentials.get(clientId);
    const token = clientCredentials?.get(integrationName);
    if (typeof token === "string") {
      return token;
    } else {
      const requestId = generateId("REQUEST");
      return new Promise((resolve, reject) => {
        this.expectResponse(clientId, requestId)
          .then((message) => {
            if (message.type === "PROVIDE_CREDENTIALS") {
              resolve(message.accessToken);
              clientCredentials?.set(integrationName, message.accessToken);
            } else {
              throw "message invalid";
            }
          })
          .catch(reject);
        this.sendMessage(clientId, {
          type: "REQUEST_CREDENTIALS",
          integrationName,
          requestId,
        });
      });
    }
  }

  /**
   * Requests and retrieves a response to a question from the client.
   */
  async retrieveQuestionResponse(
    clientId: ClientId,
    contextId: ContextId,
    question: string
  ): Promise<string> {
    const requestId = generateId("REQUEST");
    return new Promise((resolve, reject) => {
      // await response - auto cleanup handled
      this.expectResponse(clientId, requestId)
        .then((message) => {
          if (message.type === "PROVIDE_QUESTION_RESPONSE") {
            resolve(message.response);
          } else {
            throw "message invalid";
          }
        })
        .catch(reject);

      // send message to trigger response
      this.sendMessage(clientId, {
        type: "REQUEST_QUESTION_RESPONSE",
        contextId,
        question,
        requestId,
      });
    });
  }

  /**
   * Sends an agent message to the client in a specific context.
   */
  async sendAgentMessage(
    clientId: ClientId,
    contextId: ContextId,
    content: string
  ) {
    this.sendMessage(clientId, {
      type: "AGENT_MESSAGE",
      contextId,
      content,
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
}

// singleton
export const sessionManager = new SessionManager();
