import { ChatAgent } from "../agents/ChatAgent.js";
import {
  FrontendUserMessageHandler,
} from "../components/messageContext.js";
import { logger } from "../utils/logger.js";
import { gatherTools } from "../utils/gatherTools.js";

const log = logger("frontendChatMessage");

export const handleFrontendChatMessage: FrontendUserMessageHandler = async (
  message,
  ctx
) => {
  const { clientId, contextId } = ctx;
  log("Received message in", [clientId, contextId], message.content);

  new ChatAgent({
    messageContext: ctx,
    tools: gatherTools(ctx, "chat"),
  }).run();
};
