import {
  type ClientId,
  type BrowserContextAction,
  generateId,
  type RequestId,
  ts,
  logger,
} from "@celesta/common";
import { createMessageContext, type MessageContext } from "@celesta/session";

const log = logger("BrowserManager");

class BrowserManager {
  messageContexts: Map<ClientId, MessageContext> = new Map();

  registerClientId(clientId: ClientId) {
    this.messageContexts.set(
      clientId,
      createMessageContext(clientId, "BROWSER")
    );
  }

  async executeAction(
    clientId: ClientId,
    action: BrowserContextAction
  ): Promise<object> {
    const ctx = this.messageContexts.get(clientId)!;
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

  async initiateBrowserAgent(clientId: ClientId, goalDescription: string) {
    log(
      "Received browser agent request for",
      clientId,
      "with goal",
      goalDescription
    );
  }
}

export const browserManager = new BrowserManager();
