import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";
import type { MessageContext } from "../../session/src/messageContext.js";
import { ts } from "../utils/ts.js";

/**
 * Base class for all AI agents in the workflow system.
 * Provides common functionality like model initialization, message pipe access,
 * and standardized error handling.
 */
export abstract class BaseAgent {
  protected model: LanguageModel;
  protected messageContext: MessageContext<typeof this>;

  // Logic inputs are initialize and user-message
  abstract onInitialize(): Promise<any>;
  abstract onUserMessage(): Promise<any>;

  constructor(messageContext: MessageContext) {
    this.messageContext = messageContext;

    this.model = createGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY,
    })("gemini-2.5-flash");
  }

  /**
   * Send a chat message through the message pipe
   */
  protected sendChat(message: string): void {
    this.messageContext.sendAgentMessage(message, "chat");
  }

  /**
   * Send an error message through the message pipe
   */
  protected sendError(message: string): void {
    this.messageContext.sendAgentMessage(message, "error");
  }

  /**
   * Send a final response message through the message pipe
   */
  protected sendFinal(message: string): void {
    this.messageContext.sendAgentMessage(message, "final");
  }

  /**
   * Stream chat response through message pipe
   */
  protected async streamChat(
    messageStream: ReadableStream<string>
  ): Promise<string> {
    let message = "";

    for await (const text of messageStream) {
      this.messageContext.generalSendMessage(
        ts({
          type: "AGENT_MESSAGE",
          stream: true,
          data: {
            role: "assistant",
            content: text,
          },
          contextId: this.messageContext.contextId,
          messageType: "chat",
        })
      );
      message += text;
    }

    // send complete message at the end
    this.sendChat(message);
    return message;
  }

  /**
   * Stream chat response through message pipe
   */
  protected async streamFinal(
    messageStream: ReadableStream<string>
  ): Promise<string> {
    let message = "";

    for await (const text of messageStream) {
      this.messageContext.generalSendMessage(
        ts({
          type: "AGENT_MESSAGE",
          stream: true,
          data: {
            role: "assistant",
            content: text,
          },
          contextId: this.messageContext.contextId,
          messageType: "final",
        })
      );
      message += text;
    }

    // send complete message at the end
    this.sendFinal(message);
    return message;
  }

  /**
   * Ask a question to the user through the message pipe
   */
  protected async retrieveQuestionResponse(question: string): Promise<string> {
    return this.messageContext.retrieveQuestionResponse(question);
  }

  /**
   * Standardized error handling for agent operations
   */
  protected handleError(error: unknown, operation: string): never {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    this.sendError(`Failed to ${operation}: ${errorMsg}`);
    throw error;
  }
}
