import { generateText, generateObject } from "ai";
import { z } from "zod";
import { BaseAgent } from "./BaseAgent.js";
import { IMessagePipe } from "../io/IMessagePipe.js";

/**
 * Schema for workflow intent detection
 */
const WorkflowIntentSchema = z.object({
  needsWorkflow: z.boolean().describe("Whether the user's message requires a complex workflow with tools"),
  confidence: z.enum(["high", "medium", "low"]).describe("Confidence level of the assessment"),
  reasoning: z.string().describe("Brief explanation of why this does or doesn't need a workflow"),
  suggestedPrompt: z.string().optional().describe("If workflow is needed, a refined prompt optimized for workflow execution"),
});

export type WorkflowIntent = z.infer<typeof WorkflowIntentSchema>;

/**
 * Message structure for chat history
 */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

/**
 * ChatAgent handles general conversational interactions without tools.
 * It can detect when a user's request requires a complex workflow and
 * generate relevant context to pass to workflow execution.
 */
export class ChatAgent extends BaseAgent {
  protected agentName = "ChatAgent";

  constructor(config: { messagePipe: IMessagePipe; modelName?: string }) {
    // ChatAgent doesn't need ExecutionContext, just messagePipe
    super({
      messagePipe: config.messagePipe,
      modelName: config.modelName,
      
    });
  }

  /**
   * Handle a simple chat message and generate a conversational response
   */
  async handleMessage(
    userMessage: string,
    chatHistory: ChatMessage[]
  ): Promise<string> {
    try {
      // Build conversation history for context
      const messages = [
        {
          role: "system" as const,
          content: `You are Celesta, a helpful AI assistant. You can have casual conversations and answer questions.

For simple greetings, questions about yourself, jokes, or general knowledge - respond naturally and helpfully.

IMPORTANT: You only respond to messages in this chat mode. You do NOT respond to messages that require:
- Accessing emails, calendar, or files
- Searching the web
- Using external services or APIs
- Multi-step operations with tools

The system will automatically detect these requests and handle them separately. You will never see those messages in chat mode.`,
        },
        // Add recent chat history (last 10 messages for context)
        ...chatHistory.slice(-10).map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        {
          role: "user" as const,
          content: userMessage,
        },
      ];

      const response = await generateText({
        model: this.model,
        messages,
      });

      return response.text;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[ChatAgent] Error generating response: ${errorMsg}`);
      return "I apologize, but I encountered an error processing your message. Could you please try again?";
    }
  }

  /**
   * Detect if a user message requires a complex workflow
   * Only called for messages with length >= 20 characters
   */
  async detectWorkflowIntent(
    userMessage: string,
    chatHistory: ChatMessage[]
  ): Promise<WorkflowIntent> {
    try {
      // Get recent context
      const recentHistory = chatHistory.slice(-5);
      const contextStr = recentHistory.length > 0
        ? `Recent conversation:\n${recentHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}\n\n`
        : '';

      const prompt = `${contextStr}User message: "${userMessage}"

Analyze if this message requires a complex workflow with tools (email, calendar, web search, file access, etc.) or if it's a simple question/conversation.

Examples of workflow-needing requests:
- "Check my emails from today"
- "Find recent articles about AI"
- "Schedule a meeting for tomorrow"
- "What's on my calendar this week?"
- "Search for information about X"

Examples of simple chat:
- "Hello, how are you?"
- "What can you do?"
- "Tell me a joke"
- "Thanks for your help"
- "That's interesting"

Respond with your analysis.`;

      const response = await generateObject({
        model: this.model,
        prompt,
        schema: WorkflowIntentSchema,
      });

      return response.object;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[ChatAgent] Error detecting workflow intent: ${errorMsg}`);
      
      // Default to no workflow on error
      return {
        needsWorkflow: false,
        confidence: "low",
        reasoning: "Error occurred during intent detection",
      };
    }
  }

  /**
   * Generate relevant context from chat history for workflow execution
   * This helps the workflow agents understand the user's needs better
   */
  async generateWorkflowContext(
    chatHistory: ChatMessage[],
    workflowPrompt: string
  ): Promise<string> {
    try {
      // If no chat history, return empty context
      if (chatHistory.length === 0) {
        return "";
      }

      // Get recent relevant messages (last 15)
      const recentMessages = chatHistory.slice(-15);
      const historyStr = recentMessages
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join("\n");

      const prompt = `Given this conversation history and the workflow task, extract only the most relevant context that would help execute the workflow.

Conversation history:
${historyStr}

Workflow task: "${workflowPrompt}"

Extract and summarize only the relevant information from the conversation that would help execute this workflow. Be concise. If there's no relevant context, respond with "No additional context needed."`;

      const response = await generateText({
        model: this.model,
        prompt,
      });

      const context = response.text.trim();
      
      // Return empty string if no context is needed
      if (context.toLowerCase().includes("no additional context") || context.length < 10) {
        return "";
      }

      return context;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[ChatAgent] Error generating workflow context: ${errorMsg}`);
      return ""; // Return empty context on error
    }
  }
}
