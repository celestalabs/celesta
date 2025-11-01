import type { MessageContext } from "./messageContext.js";

export const wrappedToolExecutor =
  (ctx: MessageContext<any>, toolName: string) =>
  <T extends object, R extends object>(fn: (input: T) => Promise<R>) =>
    (async (input: T) => {
      const handleToolResponse = ctx.sendToolInvocationMessage(toolName, input);
      const toolResponse = await fn(input);
      handleToolResponse(toolResponse);
      return toolResponse;
    }) as (input: T) => Promise<R>;
