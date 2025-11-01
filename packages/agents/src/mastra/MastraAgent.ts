/* Mastra Agent wrapped in BaseAgent, setups global agent context */
import { BaseAgent, logger } from "@celesta/common";
import type { MessageContext } from "@celesta/session";
import { Agent } from "@mastra/core/agent";
import { RuntimeContext } from "@mastra/core/runtime-context";

interface MastraBaseAgentConfig {
  messageContext: MessageContext;
  agent: Agent;
}

export interface MastraBaseAgentRuntimeContext {
  "global.date": string;
}

export abstract class MastraBaseAgent<
  RuntimeContextT extends
    MastraBaseAgentRuntimeContext = MastraBaseAgentRuntimeContext,
> extends BaseAgent {
  agent: Agent;
  runtimeContext: RuntimeContext<MastraBaseAgentRuntimeContext>;
  private log: (msg: string) => void;

  constructor({ messageContext, agent }: MastraBaseAgentConfig) {
    super(messageContext);
    this.agent = agent;
    this.log = logger(agent.name);
    this.runtimeContext = new RuntimeContext<RuntimeContextT>();
  }

  async onInitialize() {
    this.runtimeContext.set(
      "global.date",
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    );
  }
}
