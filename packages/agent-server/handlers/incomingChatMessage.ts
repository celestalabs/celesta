import { IncomingUserMessageHandler } from "../components/messageContext.js";
import { logger } from "../utils/logger.js";

const log = logger("incomingChatMessage");

export const handleIncomingChatMessage: IncomingUserMessageHandler = (
  message,
  ctx
) => {
  // For now, just log the incoming chat message
  log("Received message in", [ctx.clientId, ctx.contextId], message.content);
};
