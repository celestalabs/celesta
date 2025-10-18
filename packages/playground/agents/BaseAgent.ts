import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { ExecutionContext } from "../components/ExecutionContext.js";
import { IMessagePipe } from "../io/IMessagePipe.js";

/**
 * Base configuration for all agents
 */
export interface BaseAgentConfig {
  executionContext: ExecutionContext;
  modelName?: string;
}

/**
 * Base class for all AI agents in the workflow system.
 * Provides common functionality like model initialization, message pipe access,
 * and standardized error handling.
 */
export abstract class BaseAgent {
  protected executionContext: ExecutionContext;
  protected model: ReturnType<ReturnType<typeof createGoogleGenerativeAI>>;
  protected messagePipe: IMessagePipe;
  protected abstract agentName: string;

  constructor(config: BaseAgentConfig) {
    this.executionContext = config.executionContext;
    this.messagePipe = config.executionContext.getMessagePipe();
    
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
    
    this.model = google(config.modelName || "gemini-2.5-flash");
  }

  /**
   * Send a status message through the message pipe
   */
  protected sendStatus(message: string): void {
    this.messagePipe.send("status", message, this.agentName);
  }

  /**
   * Send an info message through the message pipe
   */
  protected sendInfo(message: string): void {
    this.messagePipe.send("info", message, this.agentName);
  }

  /**
   * Send an error message through the message pipe
   */
  protected sendError(message: string): void {
    this.messagePipe.send("error", message, this.agentName);
  }

  /**
   * Send a final response message through the message pipe
   */
  protected sendFinal(message: string): void {
    this.messagePipe.send("final", message, this.agentName);
  }

  /**
   * Ask a question to the user through the message pipe
   */
  protected async ask(question: string): Promise<string> {
    return this.messagePipe.ask(question, this.agentName);
  }

  /**
   * Standardized error handling for agent operations
   */
  protected handleError(error: unknown, operation: string): never {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    this.sendError(`Failed to ${operation}: ${errorMsg}`);
    throw error;
  }

  /**
   * Get previous task data for context-aware operations
   */
  protected getPreviousTaskData() {
    return this.executionContext.getAllTaskData();
  }

  /**
   * Get detailed context summary
   */
  protected getDetailedContext(): string {
    return this.executionContext.getDetailedContextSummary();
  }

  /**
   * Get the original user prompt
   */
  protected getPrompt(): string {
    return this.executionContext.getPrompt();
  }
}
