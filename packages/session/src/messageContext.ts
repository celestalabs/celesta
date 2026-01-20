import {
  type RequestId,
  type ClientId,
  type ContextId,
  type AgentMessageType,
  type ConversationWSMessage,
  type FrontendWSUserMessage,
  type ServerWSMessage,
  ts,
  BaseAgent,
  logger,
  generateId,
  type IntegrationName,
} from "@celesta/common";
import { sessionManager } from "./sessionManager.js";

const log = logger("messageContext");

export type HandlerAgentCreator<T extends BaseAgent> = (
  ctx: InternalMessageContext<T>
) => Promise<T>;

export type MessageContextConfig<T extends BaseAgent> = {
  clientId: ClientId;
  contextId: ContextId;
  createHandlerAgent?: HandlerAgentCreator<T>;
  handleAfterInitialize?: (res: Awaited<ReturnType<T["onInitialize"]>>) => void;
  handleAfterUserMessage?: (
    res: Awaited<ReturnType<T["onUserMessage"]>>
  ) => void;
};

/**
 * Internal implementation of MessageContext.
 */

class InternalMessageContext<T extends BaseAgent> {
  clientId: ClientId;
  contextId: ContextId;
  messages: ConversationWSMessage[] = [];
  private handlerAgent: T | undefined;
  private handleAfterInitialize?: MessageContextConfig<T>["handleAfterInitialize"];
  private handleAfterUserMessage?: MessageContextConfig<T>["handleAfterUserMessage"];

  constructor({
    clientId,
    contextId,
    createHandlerAgent,
    handleAfterInitialize,
    handleAfterUserMessage,
  }: MessageContextConfig<T>) {
    this.clientId = clientId;
    this.contextId = contextId;
    this.handleAfterInitialize = handleAfterInitialize;
    this.handleAfterUserMessage = handleAfterUserMessage;

    this.generalSendMessage(
      ts({
        type: "CONTEXT_CREATED",
        contextId,
      })
    );

    log(`Created context ${contextId} for client ${clientId}.`);

    createHandlerAgent?.(this).then(async (agent) => {
      this.handlerAgent = agent;
      const onInitializeResponse = await this.handlerAgent?.onInitialize();
      this.handleAfterInitialize?.(onInitializeResponse);
    });
  }

  /**
   * Handle an frontend message for this context.
   */
  async handleFrontendUserMessage(message: FrontendWSUserMessage) {
    log(
      `Received message in context ${this.contextId} from client ${this.clientId}: ${message.data.content}`
    );
    this.messages.push(message);
    const onUserMessageResponse = await this.handlerAgent?.onUserMessage();
    this.handleAfterUserMessage?.(onUserMessageResponse);
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
   * Requests to hand off a complex task to the workflow system.
   * For high confidence, auto-starts without user confirmation.
   * For low/medium confidence, asks user first.
   * Returns true if workflow started, false if declined.
   */
  async requestWorkflowHandoff(params: {
    content: string;
    suggestedPrompt: string;
    confidence: "low" | "medium" | "high";
    reasoning: string;
  }): Promise<boolean> {
    // High confidence: auto-start without asking
    if (params.confidence === "high") {
      sessionManager.createWorkflowFromChat(
        this.clientId,
        params.suggestedPrompt
      );
      return true;
    }

    // Low/medium confidence: ask user first
    const requestId = generateId("REQUEST");
    return new Promise((resolve, reject) => {
      sessionManager
        .expectResponse(this.clientId, requestId)
        .then((message) => {
          if (message.type === "PROVIDE_SHOULD_START_WORKFLOW") {
            if (message.yes) {
              // Trigger workflow creation
              sessionManager.createWorkflowFromChat(
                this.clientId,
                params.suggestedPrompt
              );
            }
            resolve(message.yes);
          } else {
            throw "message invalid";
          }
        })
        .catch(reject);

      sessionManager.sendMessage(
        this.clientId,
        ts({
          type: "REQUEST_SHOULD_START_WORKFLOW",
          contextId: this.contextId,
          requestId,
          content: params.content,
          suggestedPrompt: params.suggestedPrompt,
          confidence: params.confidence,
          reasoning: params.reasoning,
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
  generalSendMessage(message: ServerWSMessage) {
    sessionManager.sendMessage(this.clientId, message);
  }

  /**
   * Sends an agent message to the client in a specific context.
   */
  async sendAgentMessage(content: string, type: AgentMessageType) {
    const message = ts({
      type: "AGENT_MESSAGE",
      contextId: this.contextId,
      data: {
        role: "assistant",
        content,
      },
      messageType: type,
    }) satisfies ServerWSMessage;

    this.messages.push(message);
    this.generalSendMessage(message);
  }

  /**
   * Send update message that a tool was called (for UI purposes)
   * Returns handler to send tool result later
   */
  sendToolInvocationMessage(toolName: string, input: object) {
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

    return {
      handleToolResponse: (output: object) => {
        this.generalSendMessage(
          ts({
            type: "TOOL_RESULT",
            toolCallId,
            output: JSON.stringify(output),
            contextId: this.contextId,
          })
        );
      },
      toolCallId,
    };
  }
}

export const createMessageContext = <T extends BaseAgent>(
  config: MessageContextConfig<T>
) => new InternalMessageContext(config);

export type MessageContext<T extends BaseAgent = any> = ReturnType<
  typeof createMessageContext<T>
>;
