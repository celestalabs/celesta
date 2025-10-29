import {
  RequestId,
  ClientId,
  ContextId,
  AgentMessageType,
  ConversationWSMessage,
  FrontendWSUserMessage,
  ServerWSMessage,
  ts,
  BaseAgent,
  logger,
  generateId,
} from "@celesta/common";
import { IntegrationName } from "@celesta/integrations";
import { sessionManager } from "./sessionManager.js";

const log = logger("messageContext");

export type HandlerAgentCreator = (ctx: InternalMessageContext) => BaseAgent;

/**
 * Internal implementation of MessageContext.
 */

class InternalMessageContext {
  clientId: ClientId;
  contextId: ContextId;
  messages: ConversationWSMessage[] = [];
  private handlerAgent: BaseAgent;

  constructor(
    clientId: ClientId,
    contextId: ContextId,
    createHandlerAgent: HandlerAgentCreator
  ) {
    this.clientId = clientId;
    this.contextId = contextId;
    this.handlerAgent = createHandlerAgent(this);

    this.handlerAgent.onInitialize();
  }

  /**
   * Handle an frontend message for this context.
   */
  handleFrontendUserMessage(message: FrontendWSUserMessage) {
    log(
      `Received message in context ${this.contextId} from client ${this.clientId}: ${message.content}`
    );
    this.messages.push(message);
    this.handlerAgent.onUserMessage();
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
        sessionManager.sendMessage(
          this.clientId,
          ts({
            type: "REQUEST_CREDENTIALS",
            integrationName,
            requestId,
          })
        );
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
      sessionManager.sendMessage(
        this.clientId,
        ts({
          type: "REQUEST_QUESTION_RESPONSE",
          contextId: this.contextId,
          question,
          requestId,
        })
      );
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
  async generalSendMessage(message: ServerWSMessage) {
    sessionManager.sendMessage(this.clientId, message);
  }

  /**
   * Sends an agent message to the client in a specific context.
   */
  async sendAgentMessage(content: string, type: AgentMessageType) {
    const message = ts({
      type: "AGENT_MESSAGE",
      contextId: this.contextId,
      content,
      messageType: type,
    }) satisfies ServerWSMessage;

    this.messages.push(message);
    this.generalSendMessage(message);
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

    this.generalSendMessage(
      ts({
        type: "TOOL_INVOCATION",
        contextId: this.contextId,
        toolName,
        toolCallId,
        input: JSON.stringify(input),
      })
    );

    return (output: object) => {
      this.generalSendMessage(
        ts({
          type: "TOOL_RESULT",
          toolCallId,
          output: JSON.stringify(output),
          contextId: this.contextId,
        })
      );
    };
  }
}

export const createMessageContext = (
  clientId: ClientId,
  contextId: ContextId,
  createHandlerAgent: (ctx: InternalMessageContext) => BaseAgent
) => new InternalMessageContext(clientId, contextId, createHandlerAgent);

export type MessageContext = ReturnType<typeof createMessageContext>;
