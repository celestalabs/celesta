import type { ToolCallId } from "@celesta/common";
import type { MessageContext } from "./messageContext.js";

export const wrappedToolExecutor =
  <T extends object, R extends object>(ctx: MessageContext, toolName: string) =>
  (fn: (input: T, toolCallId: ToolCallId) => Promise<R>) =>
    (async (input: T) => {
      const { handleToolResponse, toolCallId } = ctx.sendToolInvocationMessage(
        toolName,
        input
      );
      const toolResponse = await fn(input, toolCallId);
      handleToolResponse(toolResponse);
      return toolResponse;
    }) as (input: T) => Promise<R>;
