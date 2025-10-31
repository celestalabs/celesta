import { BrowserAgent } from "@celesta/agents";
import {
  type ClientId,
  type BrowserContextAction,
  generateId,
  type RequestId,
  ts,
  logger,
  type ContextId,
  BaseAgent,
} from "@celesta/common";
import { createMessageContext, type MessageContext } from "@celesta/session";

const log = logger("BrowserManager");

class BrowserManager {
  messageContexts: Map<ClientId, Map<ContextId, MessageContext<BaseAgent>>> =
    new Map();

  registerClientId(clientId: ClientId) {
    this.messageContexts.set(clientId, new Map());
    this.messageContexts.get(clientId)!.set(
      "BROWSER_CONTEXT",
      createMessageContext({
        clientId,
        contextId: "BROWSER_CONTEXT",
      })
    );
  }

  async executeAction(
    clientId: ClientId,
    action: BrowserContextAction
  ): Promise<object> {
    const ctx = this.messageContexts.get(clientId)!.get("BROWSER_CONTEXT")!;
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
    goalDescription: string
  ): ReturnType<BrowserAgent["onInitialize"]> {
    return new Promise((resolve, reject) => {
      const browserAgentId = generateId("BROWSER_AGENT");

      log(
        "Received browser agent request for",
        clientId,
        "with goal",
        goalDescription
      );

      this.messageContexts.get(clientId)!.set(
        browserAgentId,
        createMessageContext<BrowserAgent>({
          clientId,
          contextId: browserAgentId,
          createHandlerAgent: async (messageContext) =>
            new BrowserAgent({
              messageContext,
              goalDescription,
            }),
          handleAfterInitialize: (response) =>
            response.success ? resolve(response) : reject(response),
        })
      );
    });
  }
}

export const browserManager = new BrowserManager();
