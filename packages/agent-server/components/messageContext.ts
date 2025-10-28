import { IntegrationName } from "@celesta/integrations-api/integrations/integrationName.js";
import {
  AgentMessageType,
  ClientId,
  ContextId,
  ConversationWSMessage,
  IncomingWSUserMessage,
  OutgoingWSMessage,
  RequestId,
} from "../types/index.js";
import { generateId } from "../utils/generateId.js";
import { logger } from "../utils/logger.js";
import { sessionManager } from "./sessionManager.js";

const log = logger("messageContext");

/**
 * Handler type for incoming user messages within a message context.
 */

export type IncomingUserMessageHandler = (
  message: IncomingWSUserMessage,
  ctx: InternalMessageContext
) => void;

/**
 * Internal implementation of MessageContext.
 */

class InternalMessageContext {
  clientId: ClientId;
  contextId: ContextId;
  messages: ConversationWSMessage[] = [];
  private onIncomingMessage: IncomingUserMessageHandler;

  constructor(
    clientId: ClientId,
    contextId: ContextId,
    onIncomingMessage: IncomingUserMessageHandler
  ) {
    this.clientId = clientId;
    this.contextId = contextId;
    this.onIncomingMessage = onIncomingMessage;
  }

  /**
   * Handle an incoming message for this context.
   */
  handleIncomingMessage(message: IncomingWSUserMessage) {
    log(
      `Received message in context ${this.contextId} from client ${this.clientId}: ${message.content}`
    );
    this.messages.push(message);
    this.onIncomingMessage(message, this);
  }

  /**
   * Retrieves credentials for a client and integration.
   * Requests credentials from client if not cached.
   */
  async retrieveCredentials(integrationName: IntegrationName): Promise<string> {
    const clientCredentials = sessionManager.credentials.get(this.clientId);
    const token = clientCredentials?.get(integrationName);
    if (typeof token === "string") {
      return token;
    } else {
      const requestId = generateId("REQUEST");
      return new Promise((resolve, reject) => {
        sessionManager
          .expectResponse(this.clientId, requestId)
          .then((message) => {
            if (message.type === "PROVIDE_CREDENTIALS") {
              resolve(message.accessToken);
              clientCredentials?.set(integrationName, message.accessToken);
            } else {
              throw "message invalid";
            }
          })
          .catch(reject);
        sessionManager.sendMessage(this.clientId, {
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
  async retrieveQuestionResponse(question: string): Promise<string> {
    const requestId = generateId("REQUEST");
    return new Promise((resolve, reject) => {
      // await response - auto cleanup handled
      sessionManager
        .expectResponse(this.clientId, requestId)
        .then((message) => {
          if (message.type === "PROVIDE_QUESTION_RESPONSE") {
            resolve(message.response);
          } else {
            throw "message invalid";
          }
        })
        .catch(reject);

      // send message to trigger response
      sessionManager.sendMessage(this.clientId, {
        type: "REQUEST_QUESTION_RESPONSE",
        contextId: this.contextId,
        question,
        requestId,
      });
    });
  }

  /**
   * General message receipt awaiting method.
   */
  async generalExpectResponse(requestId: RequestId) {
    return sessionManager.expectResponse(this.clientId, requestId);
  }

  /**
   * General message sending method.
   */
  async generalSendMessage(message: OutgoingWSMessage) {
    sessionManager.sendMessage(this.clientId, message);
  }

  /**
   * Sends an agent message to the client in a specific context.
   */
  async sendAgentMessage(content: string, type: AgentMessageType) {
    const message = {
      type: "AGENT_MESSAGE",
      contextId: this.contextId,
      content,
      messageType: type,
    } satisfies OutgoingWSMessage;

    this.messages.push(message);
    sessionManager.sendMessage(this.clientId, message);
  }

  /**
   * Send update message that a tool was called (for UI purposes)
   * Returns handler to send tool result later
   */
  sendToolInvocationMessage(
    toolName: string,
    input: object
  ): (output: object) => void {
    const toolCallId = generateId("TOOL_CALL");

    sessionManager.sendMessage(this.clientId, {
      type: "TOOL_INVOCATION",
      contextId: this.contextId,
      toolName,
      toolCallId,
      input: JSON.stringify(input),
    });

    return (output: object) => {
      sessionManager.sendMessage(this.clientId, {
        type: "TOOL_RESULT",
        toolCallId,
        output: JSON.stringify(output),
      });
    };
  }
}

export const createMessageContext = (
  clientId: ClientId,
  contextId: ContextId,
  onIncomingMessage: IncomingUserMessageHandler = () => {}
) => new InternalMessageContext(clientId, contextId, onIncomingMessage);

export type MessageContext = ReturnType<typeof createMessageContext>;
