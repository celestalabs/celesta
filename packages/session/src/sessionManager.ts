/**
 * SessionManager handles client registration, credential management,
 * WebSocket communication, and request/response tracking for agent-server.
 */

import {
  type RequestId,
  type ClientId,
  type ContextId,
  type FrontendWSResponseMessage,
  type FrontendWSUserMessage,
  type ServerWSMessage,
  type IntegrationName,
  logger,
  BaseAgent,
  generateId,
  ts,
} from "@celesta/common";
import { WebSocket } from "ws";
import {
  createMessageContext,
  type MessageContext,
  type MessageContextConfig,
} from "./messageContext.js";

const log = logger("sessionManager");

/**
 * Manages sessions, credentials, and WebSocket messaging for clients.
 */

class SessionManager {
  // Maps client IDs to their user IDs
  userIds: Map<ClientId, string> = new Map();

  // Maps client IDs to their credentials per integration
  credentials: Map<ClientId, Map<IntegrationName, string>> = new Map();

  // Maps client IDs to the tools they have available
  // tools: Map<ClientId, Integrations> = new Map();

  // Maps client IDs to their WebSocket connections
  sockets: Map<ClientId, WebSocket> = new Map();

  // Tracks pending requests awaiting responses per client
  pendingRequests: Map<
    ClientId,
    Map<RequestId, (message: FrontendWSResponseMessage) => void>
  > = new Map();

  // Tracks active message contexts per client
  messageContexts: Map<ClientId, Map<ContextId, MessageContext>> = new Map();

  // Callback to create workflow agent - set by server to avoid circular deps
  private workflowAgentCreator:
    | ((messageContext: MessageContext, prompt: string) => Promise<BaseAgent>)
    | null = null;

  /**
   * Register a callback for creating workflow agents.
   * Called by server.ts to inject the CoordinationAgent creator.
   */
  registerWorkflowAgentCreator(
    creator: (
      messageContext: MessageContext,
      prompt: string
    ) => Promise<BaseAgent>
  ) {
    this.workflowAgentCreator = creator;
  }

  /**
   * Creates a workflow from chat context.
   * Used when ChatAgent hands off a complex task to the workflow system.
   */
  async createWorkflowFromChat(clientId: ClientId, prompt: string) {
    if (!this.workflowAgentCreator) {
      log("Workflow agent creator not registered");
      return;
    }

    const contextId = generateId("WORKFLOW");
    const workflowAgentCreator = this.workflowAgentCreator;

    await this.createContext({
      clientId,
      contextId,
      createHandlerAgent: async (messageContext) => {
        return workflowAgentCreator(messageContext, prompt);
      },
    });

    // Notify frontend that workflow has started
    this.sendMessage(
      clientId,
      ts({
        type: "WORKFLOW_STATUS_CHANGED",
        workflowId: contextId,
        prompt,
        status: "running",
      })
    );
  }

  /**
   * Creates a new message context for the specified client.
   */
  async createContext<T extends BaseAgent>(config: MessageContextConfig<T>) {
    this.messageContexts
      .get(config.clientId)!
      .set(config.contextId, createMessageContext(config));
  }

  /**
   * Registers a new client with its WebSocket connection.
   */
  registerClientId(clientId: ClientId, ws: WebSocket, userId?: string) {
    if (!this.credentials.has(clientId)) {
      this.sockets.set(clientId, ws);
      this.credentials.set(clientId, new Map());
      this.pendingRequests.set(clientId, new Map());
      this.messageContexts.set(clientId, new Map());
      if (userId) {
        this.userIds.set(clientId, userId);
      }
    } else {
      log(`Client ID ${clientId} is already registered.`);
    }
  }

  /**
   * Gets the user ID for a given client.
   */
  getUserId(clientId: ClientId): string | undefined {
    return this.userIds.get(clientId);
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
