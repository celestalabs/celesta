import { sessionManager } from "./components/sessionManager.js";
import { isIncomingWSMessage } from "./types/guards.js";
import { ClientId } from "./types/index.js";
import { logger } from "./utils/logger.js";

const log = logger("handler");

export function handleIncomingMessage(clientId: ClientId, rawMessage: any) {
  const message = JSON.parse(rawMessage.toString());
  // type guard to verify message structure
  if (!isIncomingWSMessage(message)) {
    log(`Invalid message received from ${clientId}:`, message);
    return;
  }

  switch (message.type) {
    case "USER_MESSAGE": {
      log(`User message from ${clientId}: ${message.content}`);
      break;
    }

    case "PROVIDE_CREDENTIALS": {
      log(
        `Credentials from ${clientId} for integration ${message.integrationName}`
      );
      sessionManager.triggerRequestResponse(
        clientId,
        message.requestId,
        message
      );
      break;
    }

    case "PROVIDE_QUESTION_RESPONSE": {
      log(`Question response from ${clientId}: ${message.response}`);
      sessionManager.triggerRequestResponse(
        clientId,
        message.requestId,
        message
      );
      break;
    }
  }
}
