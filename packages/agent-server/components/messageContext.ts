import { IntegrationName } from "@celesta/integrations-api/integrations/integrationName.js";
import {
  ClientId,
  ContextId,
  IncomingWSMessage,
  OutgoingWSMessage,
  WSMessage,
} from "../types/index.js";
import { generateId } from "../utils/generateId.js";
import { sessionManager } from "./sessionManager.js";

type IncomingMessageHandler = (
  message: IncomingWSMessage,
  ctx: InternalMessageContext
) => void;

/**
 * Internal implementation of MessageContext.
 */

class InternalMessageContext {
  private clientId: ClientId;
  private contextId: ContextId;
  private messages: WSMessage[] = [];
  private onIncomingMessage: IncomingMessageHandler;

  constructor(
    clientId: ClientId,
    contextId: ContextId,
    onIncomingMessage: IncomingMessageHandler
  ) {
    this.clientId = clientId;
    this.contextId = contextId;
    this.onIncomingMessage = onIncomingMessage;
  }

  /**
   * Handle an incoming message for this context.
   */
  handleIncomingMessage(message: IncomingWSMessage) {
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
   * Sends an agent message to the client in a specific context.
   */
  async sendAgentMessage(content: string) {
    const message = {
      type: "AGENT_MESSAGE",
      contextId: this.contextId,
      content,
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
  onIncomingMessage: IncomingMessageHandler = () => {}
) => new InternalMessageContext(clientId, contextId, onIncomingMessage);

export type MessageContext = ReturnType<typeof createMessageContext>;
