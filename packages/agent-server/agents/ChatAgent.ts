import { ConversationWSMessage, WSMessage } from "@celesta/types";
import {
  generateText,
  generateObject,
  streamText,
  ToolSet,
  stepCountIs,
} from "ai";
import { z } from "zod";
import { MessageContext } from "../components/messageContext.js";
import { BaseAgent } from "./BaseAgent.js";
import { logger } from "../utils/logger.js";
import { generateId } from "../utils/generateId.js";
import { gatherTools } from "../utils/gatherTools.js";
import { sessionManager } from "../components/sessionManager.js";
import { CoordinationAgent } from "./workflow/CoordinationAgent.js";

const log = logger("ChatAgent");

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
  private tools: ToolSet;

  constructor(messageContext: MessageContext) {
    super(messageContext);
    this.tools = gatherTools(messageContext, "chat");
  }

  /**
   * Handle a chat message with optional tool execution for simple operations
   */
  private async handleMessage() {
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

ALWAYS RESPOND WITH TEXT TO THE USER:
- When you call a tool, always reply with a text response to the user, either by synthesizing the tool call information or discussing any errors that occurred.
- Do not assume tool call errors are automatically surfaced to the user; if a tool call fails or returns an error, explain the issue in your reply.
- Present tool results in a friendly, readable way, and always ensure the user receives a clear text response regardless of tool call outcome.

Be conversational and natural in your responses.`,
        },
        // Add recent chat history
        ...this.messageContext.messages.map((msg) => ({
          role:
            msg.type === "USER_MESSAGE"
              ? ("user" as const)
              : ("assistant" as const),
          content: msg.content,
        })),
      ];

      // If tools are available, use streamText for tool execution
      if (this.tools && Object.keys(this.tools).length > 0) {
        const { textStream } = streamText({
          model: this.model,
          tools: this.tools,
          stopWhen: stepCountIs(4),
          messages,
        });

        // Consume the text stream
        let fullText = "";
        for await (const chunk of textStream) {
          fullText += chunk;
        }

        this.sendChat(fullText.trim() || "I've completed your request.");
      } else {
        // No tools available, just generate text
        const response = await generateText({
          model: this.model,
          messages,
        });

        this.sendChat(response.text.trim() || "I've completed your request.");
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[ChatAgent] Error generating response: ${errorMsg}`);
      this.sendError(
        "I apologize, but I encountered an error processing your message. Could you please try again?"
      );
      return;
    }
  }

  /**
   * Detect if a user message requires a complex workflow
   * Only called for messages with length >= 20 characters
   */
  private async detectWorkflowIntent(): Promise<WorkflowIntent> {
    try {
      // Get recent context, excluding current message
      const recentHistory = this.messageContext.messages.slice(-5, -1);
      const contextStr =
        recentHistory.length > 0
          ? `Recent conversation:\n${recentHistory.map((msg) => `${msg.type === "USER_MESSAGE" ? "user" : "assistant"}: ${msg.type}`).join("\n")}\n\n`
          : "";

      const prompt = `${contextStr}User message: "${this.messageContext.messages.at(-1)?.content}"

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

  // No initialization needed for ChatAgent
  async onInitialize() {
    return;
  }

  /**
   * Chat agent executes onUserMessage because it needs to respond
   */
  async onUserMessage() {
    try {
      let shouldSendChatResponse = true;

      let latestMessage = this.messageContext.messages.at(-1)?.content;

      if (!latestMessage) {
        log(
          `No latest message found for client ${this.messageContext.clientId}`
        );
        return;
      }

      log(
        "Received message in",
        [this.messageContext.clientId, this.messageContext.contextId],
        latestMessage
      );

      // Check if message is substantial enough for intent detection FIRST
      if (latestMessage.length >= 20) {
        shouldSendChatResponse = false;
        log(`Detecting workflow intent for message: "${latestMessage}"`);

        const intent = await this.detectWorkflowIntent();

        log(
          `Intent detection result: needsWorkflow=${intent.needsWorkflow}, confidence=${intent.confidence}`
        );

        // If workflow is detected with high/medium confidence, skip chat response
        if (intent.needsWorkflow && intent.confidence !== "low") {
          const workflowRequestId = generateId("REQUEST");
          const prompt = intent.suggestedPrompt || latestMessage;

          this.messageContext
            .generalExpectResponse(workflowRequestId)
            .then((response) => {
              if (
                response.type === "PROVIDE_SHOULD_START_WORKFLOW" &&
                response.yes
              ) {
                log(
                  `Client ${this.messageContext.clientId} approved starting workflow for context ${this.messageContext.contextId}`
                );
                this.sendChat("Starting a workflow for you in the background!");

                const contextId = generateId("WORKFLOW");
                sessionManager.createContext(
                  this.messageContext.clientId,
                  contextId,
                  (messageContext) =>
                    new CoordinationAgent({
                      messageContext,
                      prompt,
                    })
                );

                return;
              }

              throw "negative or invalid response";
            })
            .catch(() => {
              // Failure = timeout / dont start workflow
              log(
                `No (or negative) response from client ${this.messageContext.clientId} on workflow start request. Continuing chat.`
              );
              this.handleMessage();
            });

          this.messageContext.generalSendMessage({
            type: "REQUEST_SHOULD_START_WORKFLOW",
            contextId: this.messageContext.contextId,
            requestId: workflowRequestId,
            content: `I can help you with that using a workflow. ${intent.reasoning}`,
            suggestedPrompt: prompt,
            confidence: intent.confidence,
            reasoning: intent.reasoning,
          });

          log(
            `Sent workflow intent detection to client ${this.messageContext.clientId}`
          );
        } else {
          shouldSendChatResponse = true;
        }
      }

      if (shouldSendChatResponse) {
        this.handleMessage();
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log(`Chat error for client ${this.messageContext.clientId}:`, error);
      this.sendError(
        "An error occurred while processing your message: " + errorMsg
      );
    }
  }
}
