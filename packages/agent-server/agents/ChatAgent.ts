import { generateText, generateObject, streamText, ToolSet } from "ai";
import { z } from "zod";
import { MessageContext } from "../components/messageContext.js";
import { ConversationWSMessage, WSMessage } from "../types/index.js";
import { BaseAgent } from "./BaseAgent.js";

/**
 * Schema for workflow intent detection
 */
const WorkflowIntentSchema = z.object({
  needsWorkflow: z
    .boolean()
    .describe(
      "Whether the user's message requires a complex workflow with tools"
    ),
  confidence: z
    .enum(["high", "medium", "low"])
    .describe("Confidence level of the assessment"),
  reasoning: z
    .string()
    .describe("Brief explanation of why this does or doesn't need a workflow"),
  suggestedPrompt: z
    .string()
    .optional()
    .describe(
      "If workflow is needed, a refined prompt optimized for workflow execution"
    ),
});

export type WorkflowIntent = z.infer<typeof WorkflowIntentSchema>;
/**
 * ChatAgent handles conversational interactions with lightweight tool access.
 * It can execute simple, single-tool operations (like checking emails, searching web)
 * and detect when a user's request requires a complex multi-step workflow.
 */
export class ChatAgent extends BaseAgent {
  protected agentName = "ChatAgent";
  private tools: ToolSet | undefined;

  constructor({
    messageContext,
    modelName,
    tools,
  }: {
    messageContext: MessageContext;
    modelName?: string;
    tools?: ToolSet;
  }) {
    super({
      messageContext: messageContext,
      modelName: modelName,
    });
    this.tools = tools;
  }

  /**
   * Update the tools available to the chat agent
   */
  setTools(tools: ToolSet): void {
    this.tools = tools;
  }

  /**
   * Handle a chat message with optional tool execution for simple operations
   */
  async handleMessage(
    userMessage: string,
    chatHistory: ConversationWSMessage[]
  ): Promise<string> {
    try {
      const now = new Date();
      const dateString = now.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // Build conversation history for context
      const messages = [
        {
          role: "system" as const,
          content: `You are Celesta, a helpful AI assistant with access to simple tools for quick information retrieval.

Current Date: ${dateString}

You can handle:
- Simple questions (greetings, general knowledge, jokes)
- Quick single-tool operations (checking latest emails, searching web, looking up calendar events)
- Read-only information retrieval that doesn't require multi-step planning

For quick reads like "what's my latest email" or "what do I have today" - use your tools directly and respond conversationally.

IMPORTANT: You should ONLY use tools for SIMPLE, SINGLE-PURPOSE reads. For complex requests that need:
- Multiple tool calls in sequence
- Write operations (sending emails, creating events, deleting data)
- Multi-step planning or coordination
- Ambiguous requests requiring clarifying questions

...you should respond with: "This request requires a workflow. Please use the 'Start Workflow' button to execute this task."

USING TOOLS APPROPRIATELY:
- ✅ "What are my latest emails?" → Use gmail__search_and_retrieve_messages
- ✅ "What's on my calendar today?" → Use google-calendar__list_events
- ✅ "Search the web for X" → Use web-search__search_web
- ❌ "Send an email to John" → Requires workflow (write operation)
- ❌ "Find all emails from John and summarize them" → Requires workflow (multi-step)
- ❌ "Schedule a meeting tomorrow" → Requires workflow (write operation)

Be conversational and natural in your responses. Present tool results in a friendly, readable way.`,
        },
        // Add recent chat history (last 10 messages for context)
        ...chatHistory.slice(-10).map((msg) => ({
          role:
            msg.type === "USER_MESSAGE"
              ? ("user" as const)
              : ("assistant" as const),
          content: msg.content,
        })),
        {
          role: "user" as const,
          content: userMessage,
        },
      ];

      // If tools are available, use streamText for tool execution
      if (this.tools && Object.keys(this.tools).length > 0) {
        const result = streamText({
          model: this.model,
          tools: this.tools,
          messages,
        });

        // Consume the text stream
        let fullText = "";
        for await (const chunk of result.textStream) {
          fullText += chunk;
        }

        // Wait for all tool executions to complete
        await result.toolCalls;
        await result.toolResults;

        return fullText.trim() || "I've completed your request.";
      } else {
        // No tools available, just generate text
        const response = await generateText({
          model: this.model,
          messages,
        });

        return response.text;
      }
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
    chatHistory: WSMessage[]
  ): Promise<WorkflowIntent> {
    try {
      // Get recent context
      const recentHistory = chatHistory.slice(-5);
      const contextStr =
        recentHistory.length > 0
          ? `Recent conversation:\n${recentHistory.map((msg) => `${msg.type === "USER_MESSAGE" ? "user" : "assistant"}: ${msg.type}`).join("\n")}\n\n`
          : "";

      const prompt = `${contextStr}User message: "${userMessage}"

Analyze if this message requires a COMPLEX MULTI-STEP WORKFLOW or if it's a SIMPLE OPERATION that can be handled with a single tool call or conversation.

The chat agent now HAS ACCESS TO TOOLS and can handle simple reads directly. Only flag as needsWorkflow if the request is genuinely complex.

Examples that DO NOT need a workflow (chat can handle):
- "What's on my calendar today/tomorrow?" → Simple calendar read
- "Show me my latest emails" → Simple email read
- "Search the web for X" → Simple web search
- "What do I have due this week?" → Simple calendar read
- "Who emailed me today?" → Simple email search
- "Hello, how are you?" → Conversation
- "What can you do?" → Conversation

Examples that NEED a workflow (complex operations):
- "Send an email to all my colleagues about X" → Write operation with multiple recipients
- "Schedule a meeting with John, check his availability, and send invites" → Multi-step coordination
- "Find all emails from John, summarize them, and draft a response" → Multi-step analysis
- "Search for articles about X, read them, and create a summary report" → Multi-step with analysis
- "Cancel all my meetings tomorrow and reschedule them" → Multiple write operations
- "Find information about X across my emails, calendar, and web" → Multi-source aggregation

Key distinction:
- SIMPLE READ with 1 tool call + conversational response = NO WORKFLOW (chat handles it)
- WRITE operations (send, create, delete, update) = WORKFLOW
- Multi-step coordination or analysis = WORKFLOW
- Questions requiring clarification before action = WORKFLOW

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
    chatHistory: ConversationWSMessage[],
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
        .map(
          (msg) =>
            `${msg.type === "USER_MESSAGE" ? "user" : "assistant"}: ${msg.content}`
        )
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
      if (
        context.toLowerCase().includes("no additional context") ||
        context.length < 10
      ) {
        return "";
      }

      return context;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(
        `[ChatAgent] Error generating workflow context: ${errorMsg}`
      );
      return ""; // Return empty context on error
    }
  }
}
