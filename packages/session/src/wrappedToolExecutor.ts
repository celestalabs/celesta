import type { MessageContext } from "./messageContext.js";

export const wrappedToolExecutor =
  <T extends object, R extends object>(ctx: MessageContext, toolName: string) =>
  (fn: (input: T) => Promise<R>) =>
    (async (input: T) => {
      const handleToolResponse = ctx.sendToolInvocationMessage(toolName, input);
      const toolResponse = await fn(input);
      handleToolResponse(toolResponse);
      return toolResponse;
    }) as (input: T) => Promise<R>;
