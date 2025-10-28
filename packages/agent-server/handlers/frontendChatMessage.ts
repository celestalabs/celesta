import { FrontendWSUserMessage } from "@celesta/types";
import { ChatAgent } from "../agents/ChatAgent.js";
import {
  FrontendUserMessageHandler,
  MessageContext,
} from "../components/messageContext.js";
import { generateId } from "../utils/generateId.js";
import { logger } from "../utils/logger.js";

const log = logger("frontendChatMessage");

async function sendChatResponse(
  chatAgent: ChatAgent,
  message: FrontendWSUserMessage,
  ctx: MessageContext
) {
  // Generate response
  const response = await chatAgent.handleMessage(message.content, ctx.messages);

  // Add assistant response to chat history
  ctx.sendAgentMessage(response, "chat");
}

export const handleFrontendChatMessage: FrontendUserMessageHandler = async (
  message,
  ctx
) => {
  const { clientId, contextId } = ctx;

  // For now, just log the frontend chat message
  log("Received message in", [clientId, contextId], message.content);

  try {
    const chatAgent = new ChatAgent({
      messageContext: ctx,
      tools: {},
    });

    let shouldSendChatResponse = true;

    // Check if message is substantial enough for intent detection FIRST
    if (message.content.length >= 20) {
      shouldSendChatResponse = false;
      log(`Detecting workflow intent for message: "${message.content}"`);

      const intent = await chatAgent.detectWorkflowIntent(
        message.content,
        ctx.messages
      );

      log(
        `Intent detection result: needsWorkflow=${intent.needsWorkflow}, confidence=${intent.confidence}`
      );

      // If workflow is detected with high/medium confidence, skip chat response
      if (intent.needsWorkflow && intent.confidence !== "low") {
        const workflowRequestId = generateId("REQUEST");

        ctx
          .generalExpectResponse(workflowRequestId)
          .then((response) => {
            if (
              response.type === "PROVIDE_SHOULD_START_WORKFLOW" &&
              response.yes
            ) {
              log(
                `Client ${clientId} approved starting workflow for context ${contextId}`
              );
              // Here trigger the workflow start logic
            }

            throw "negative or invalid response";
          })
          .catch(() => {
            // Failure = timeout / dont start workflow
            log(
              `No (or negative) response from client ${clientId} on workflow start request. Continuing chat.`
            );
            sendChatResponse(chatAgent, message, ctx);
          });

        ctx.generalSendMessage({
          type: "REQUEST_SHOULD_START_WORKFLOW",
          contextId,
          requestId: workflowRequestId,
          content: `I can help you with that using a workflow. ${intent.reasoning}`,
          suggestedPrompt: intent.suggestedPrompt || message.content,
          confidence: intent.confidence,
          reasoning: intent.reasoning,
        });

        log(`Sent workflow intent detection to client ${clientId}`);
      } else {
        shouldSendChatResponse = true;
      }
    }

    if (shouldSendChatResponse) {
      sendChatResponse(chatAgent, message, ctx);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`Chat error for client ${clientId}:`, error);
    ctx.sendAgentMessage(
      "An error occurred while processing your message: " + errorMsg,
      "error"
    );
  }
};
