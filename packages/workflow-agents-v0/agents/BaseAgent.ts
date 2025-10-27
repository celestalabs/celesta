import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { ExecutionContext } from "../components/ExecutionContext.js";
import { IMessagePipe } from "../io/IMessagePipe.js";
// import { createGroq } from "@ai-sdk/groq";

/**
 * Base configuration for all agents
 */
export interface BaseAgentConfig {
  executionContext?: ExecutionContext;
  messagePipe?: IMessagePipe;
  modelName?: string;
  workflowId?: string;
}

/**
 * Base class for all AI agents in the workflow system.
 * Provides common functionality like model initialization, message pipe access,
 * and standardized error handling.
 */
export abstract class BaseAgent {
  protected executionContext?: ExecutionContext;
  protected model: ReturnType<ReturnType<typeof createGoogleGenerativeAI>>;
  protected messagePipe: IMessagePipe;
  protected abstract agentName: string;
  protected workflowId?: string;

  constructor(config: BaseAgentConfig) {
    this.executionContext = config.executionContext;
    // Use provided messagePipe or get from executionContext
    this.messagePipe = config.messagePipe || config.executionContext!.getMessagePipe();
    this.workflowId = config.workflowId;

    const google = createGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    this.model = google(config.modelName || "gemini-2.5-flash");
    // const groq = createGroq({
    //   apiKey: process.env.GROQ_API_KEY,
    // });

    // this.model = groq("llama-3.1-8b-instant");
  }

  /**
   * Send a status message through the message pipe
   */
  protected sendStatus(message: string): void {
    this.messagePipe.send("status", message, this.agentName, this.workflowId);
  }

  /**
   * Send an info message through the message pipe
   */
  protected sendInfo(message: string): void {
    this.messagePipe.send("info", message, this.agentName, this.workflowId);
  }

  /**
   * Send an error message through the message pipe
   */
  protected sendError(message: string): void {
    this.messagePipe.send("error", message, this.agentName, this.workflowId);
  }

  /**
   * Send a final response message through the message pipe
   */
  protected sendFinal(message: string): void {
    this.messagePipe.send("final", message, this.agentName, this.workflowId);
  }

  /**
   * Ask a question to the user through the message pipe
   */
  protected async ask(question: string): Promise<string> {
    return this.messagePipe.ask(question, this.agentName, this.workflowId);
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
    if (!this.executionContext) {
      throw new Error("ExecutionContext not available for this agent");
    }
    return this.executionContext.getAllTaskData();
  }

  /**
   * Get detailed context summary
   */
  protected getDetailedContext(): string {
    if (!this.executionContext) {
      throw new Error("ExecutionContext not available for this agent");
    }
    return this.executionContext.getDetailedContextSummary();
  }

  /**
   * Get the original user prompt
   */
  protected getPrompt(): string {
    if (!this.executionContext) {
      throw new Error("ExecutionContext not available for this agent");
    }
    return this.executionContext.getPrompt();
  }
}
