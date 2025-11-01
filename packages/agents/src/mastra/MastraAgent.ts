/* Mastra Agent wrapped in BaseAgent, setups global agent context */
import { BaseAgent, logger } from "@celesta/common";
import type { MessageContext } from "@celesta/session";
import { Agent } from "@mastra/core/agent";
import { RuntimeContext } from "@mastra/core/runtime-context";

interface MastraBaseAgentConfig {
  messageContext: MessageContext<any>;
  agent: Agent;
}

export interface MastraBaseAgentRuntimeContext {
  "global.date": string;
}

export class MastraBaseAgent<
  RuntimeContextT extends
    MastraBaseAgentRuntimeContext = MastraBaseAgentRuntimeContext,
> extends BaseAgent {
  private agent: Agent;
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
  async onUserMessage() {
    const res = await this.agent.generate(
      this.messageContext.messages.map(({ data }) => data),
      {
        runtimeContext: this.runtimeContext,
        onError: (error) => {
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          this.log(`Error generating response: ${errorMsg}`);
          this.sendError(
            "I apologize, but I encountered an error processing your message. Could you please try again?"
          );
        },
      }
    );
    this.sendChat(res.text);
  }
}
