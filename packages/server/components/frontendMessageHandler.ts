import { sessionManager } from "@celesta/session";
import { ClientId, logger } from "@celesta/common";
import { isFrontendWSMessage } from "../types/guards.js";

const log = logger("frontendMessageHandler");

export function frontendMessageHandler(clientId: ClientId, rawMessage: any) {
  const message = JSON.parse(rawMessage.toString());
  // type guard to verify message structure
  if (!isFrontendWSMessage(message)) {
    log(`Invalid message received from ${clientId}:`, message);
    return;
  }

  switch (message.type) {
    case "USER_MESSAGE": {
      log(`User message from ${clientId}: ${message.content}`);
      sessionManager.routeUserMessage(clientId, message);
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

    case "PROVIDE_SHOULD_START_WORKFLOW": {
      log(
        `Workflow start decision from ${clientId}: ${message.yes ? "yes" : "no"}`
      );
      sessionManager.triggerRequestResponse(
        clientId,
        message.requestId,
        message
      );
      break;
    }

    default: {
      log(`Unhandled message type from ${clientId}:`, message);
    }
  }
}
