import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { LanguageModel } from "ai";
import { MessageContext } from "../../session/src/messageContext.js";

/**
 * Base class for all AI agents in the workflow system.
 * Provides common functionality like model initialization, message pipe access,
 * and standardized error handling.
 */
export abstract class BaseAgent {
  protected model: LanguageModel;
  protected messageContext: MessageContext;

  // Logic inputs are initialize and user-message
  abstract onInitialize(): Promise<any>;
  abstract onUserMessage(): Promise<void>;

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
