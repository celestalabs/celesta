import { ts, BaseAgent, logger, generateId } from "@celesta/common";
import { sessionManager, MessageContext } from "@celesta/session";
import { generateText, generateObject, ToolSet, stepCountIs } from "ai";
import { z } from "zod";
import { gatherTools } from "./utils/gatherTools.js";
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
          content: `Act as Celesta, a helpful AI assistant with access to simple tools for quick information retrieval and conversational support.

Current Date: ${dateString}

Your objectives:
- Reason step-by-step to determine if a user request can be handled with a single tool call or simple conversation.
- Understand available tools and their purposes.
- For quick reads (e.g., "what's my latest email?", "what do I have today?"), use your tools directly and respond in a friendly, conversational manner.

Escalation Logic:
- If a request requires multiple tool calls, write operations (send, create, delete, update), multi-step planning, or clarification, respond with: "This request requires a workflow. Please use the 'Start Workflow' button to execute this task."
- Justify escalation with explicit reasoning.

Tool Usage:
- Only use tools for SIMPLE, SINGLE-PURPOSE reads.
- Extract necessary arguments from user context and respond with clear, actionable information.
- If a tool call fails or returns an error, explain the issue in your reply.

Output Requirements:
- Always respond with a clear, friendly, and actionable text reply to the user.
- Present tool results in a readable way, ensuring the user receives a helpful response regardless of tool call outcome.
- Self-evaluate if your response is complete and helpful before replying.

Be conversational, natural, and supportive in all responses.`,
        },
        ...this.messageContext.messages.map((msg) => ({
          role:
            msg.type === "USER_MESSAGE"
              ? ("user" as const)
              : ("assistant" as const),
          content: msg.content,
        })),
      ];

      const { text } = await generateText({
        model: this.model,
        tools: this.tools,
        stopWhen: stepCountIs(4),
        messages,
      });

      this.sendChat(text.trim() || "I've completed your request.");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log(`Error generating response: ${errorMsg}`);
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
      const recentHistory = this.messageContext.messages.slice(-10);
      const contextStr =
        recentHistory.length > 0
          ? `Recent conversation:\n${recentHistory.map((msg) => `${msg.type === "USER_MESSAGE" ? "user" : "assistant"}: ${msg.type}`).join("\n")}\n\n`
          : "";

      const prompt = `${contextStr}User message: "${this.messageContext.messages.at(-1)?.content}"

    Act as an intent detection agent. Reason step-by-step to determine if this message requires a COMPLEX MULTI-STEP WORKFLOW or if it can be handled with a single tool call or conversation.

    Your objectives:
    - Analyze the message and context, referencing examples below.
    - Justify your decision to escalate to workflow or not, with explicit reasoning.
    - Self-evaluate your confidence and reasoning before responding.

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

    Respond with your step-by-step analysis, explicit reasoning, and confidence level.`;

      const response = await generateObject({
        model: this.model,
        prompt,
        schema: WorkflowIntentSchema,
      });

      return response.object;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log(`[ChatAgent] Error detecting workflow intent: ${errorMsg}`);

      // Default to no workflow on error
      return {
        needsWorkflow: false,
        confidence: "low",
        reasoning: "Error occurred during intent detection",
      };
    }
  }

  // No initialization needed for ChatAgent
  async onInitialize() {}

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

                this.messageContext.generalSendMessage(
                  ts({
                    type: "WORKFLOW_STATUS_CHANGED",
                    workflowId: contextId,
                    prompt,
                    status: "running",
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

          this.messageContext.generalSendMessage(
            ts({
              type: "REQUEST_SHOULD_START_WORKFLOW",
              contextId: this.messageContext.contextId,
              requestId: workflowRequestId,
              content: `I can help you with that using a workflow. ${intent.reasoning}`,
              suggestedPrompt: prompt,
              confidence: intent.confidence,
              reasoning: intent.reasoning,
            })
          );

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
