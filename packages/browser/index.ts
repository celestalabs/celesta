import { BrowserAgent } from "@celesta/agents";
import {
  type ClientId,
  type BrowserContextAction,
  generateId,
  type RequestId,
  ts,
  logger,
  type ToolCallId,
  type ContextId,
} from "@celesta/common";
import { sessionManager } from "@celesta/session";

const log = logger("BrowserManager");

class BrowserManager {
  registerClientId(clientId: ClientId) {
    sessionManager.createContext({
      clientId,
      contextId: "BROWSER_CONTEXT",
    });
  }

  async executeAction(
    clientId: ClientId,
    action: BrowserContextAction
  ): Promise<object> {
    const ctx = sessionManager.messageContexts
      .get(clientId)!
      .get("BROWSER_CONTEXT")!;
    const requestId: RequestId = generateId("REQUEST");

    return new Promise((resolve, reject) => {
      ctx
        .generalExpectResponse(requestId)
        .then((response) => {
          if (response.type === "PROVIDE_BROWSER_CONTEXT_ACTION") {
            resolve(response.response);
          } else {
            reject("Invalid response.");
          }
        })
        .catch((err) => {
          reject("Response timed out. " + err);
        });

      ctx.generalSendMessage(
        ts({
          type: "REQUEST_BROWSER_CONTEXT_ACTION",
          requestId,
          action,
        })
      );
    });
  }

  initiateBrowserAgent(
    clientId: ClientId,
    contextId: ContextId,
    toolCallId: ToolCallId,
    goalDescription: string
  ): ReturnType<BrowserAgent["onInitialize"]> {
    return new Promise(async (resolve, reject) => {
      const browserAgentId = generateId("BROWSER_AGENT");

      log(
        "Received browser agent request for",
        clientId,
        "with goal",
        goalDescription
      );

      await sessionManager.createContext<BrowserAgent>({
        clientId,
        contextId: browserAgentId,
        createHandlerAgent: async (messageContext) =>
          new BrowserAgent({
            messageContext,
            goalDescription,
          }),
        handleAfterInitialize: (response) =>
          response.success ? resolve(response) : reject(response),
      });

      sessionManager.sendMessage(
        clientId,
        ts({
          type: "BROWSER_AGENT_INITIALIZED",
          contextId,
          browserAgentId,
          toolCallId,
        })
      );
    });
  }
}

export const browserManager = new BrowserManager();
