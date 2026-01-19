import { type ClientId, generateId, logger, ts } from "@celesta/common";
import { sessionManager } from "@celesta/session";
import { CoordinationAgent } from "../../agents/src/workflow/CoordinationAgent.js";
import { isFrontendWSMessage } from "./guards.js";
import { voiceService } from "./voiceService.js";

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
      log(`User message from ${clientId}: ${message.data.content}`);
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

    case "PROVIDE_BROWSER_CONTEXT_ACTION": {
      log(`Browser context action response from ${clientId}`);
      sessionManager.triggerRequestResponse(
        clientId,
        message.requestId,
        message
      );
      break;
    }

    case "PROVIDE_BROWSER_AGENT_ACTION": {
      // log(`Browser agent action response from ${clientId}`);
      sessionManager.triggerRequestResponse(
        clientId,
        message.requestId,
        message
      );
      break;
    }

    case "REQUEST_WORKFLOW": {
      log(`Workflow request from ${clientId}: ${message.prompt}`);

      const contextId = generateId("WORKFLOW");

      sessionManager
        .createContext({
          clientId,
          contextId,
          createHandlerAgent: async (messageContext) =>
            new CoordinationAgent({
              messageContext,
              prompt: message.prompt,
            }),
        })
        .then(() =>
          sessionManager.sendMessage(
            clientId,
            ts({
              type: "WORKFLOW_STATUS_CHANGED",
              workflowId: contextId,
              prompt: message.prompt,
              status: "running",
            })
          )
        );

      break;
    }

    // Voice message handlers
    case "VOICE_START": {
      log(`Voice session start from ${clientId}: ${message.sessionId}`);
      voiceService.startSession(clientId, message.sessionId);
      break;
    }

    case "VOICE_AUDIO_CHUNK": {
      voiceService.sendAudioChunk(message.sessionId, message.audioData);
      break;
    }

    case "VOICE_STOP": {
      log(`Voice session stop from ${clientId}: ${message.sessionId}`);
      voiceService.stopSession(message.sessionId);
      break;
    }

    case "REQUEST_TTS": {
      log(`TTS request from ${clientId}: ${message.text.slice(0, 50)}...`);
      voiceService.textToSpeech(clientId, message.text);
      break;
    }

    default: {
      log(`Unhandled message type from ${clientId}:`, message);
    }
  }
}
