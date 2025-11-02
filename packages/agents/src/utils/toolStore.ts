import type { ClientId, FullToolSet, ToolMode } from "@celesta/common";
import type { MessageContext } from "@celesta/session";
import type { ToolSet } from "@mastra/core/tools";

type FullToolSetCreator = (messageContext: MessageContext) => FullToolSet;

class ToolStore {
  private tools: Map<ClientId, FullToolSetCreator> = new Map();

  registerClientId(clientId: ClientId, tools: FullToolSetCreator) {
    this.tools.set(clientId, tools);
  }

  getTools(
    messageContext: MessageContext,
    mode: ToolMode
  ): ToolSet | undefined {
    return this.tools.get(messageContext.clientId)?.(messageContext)?.[mode];
  }
}

export const toolStore = new ToolStore();
