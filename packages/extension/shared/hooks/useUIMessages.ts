import { ContextId, ToolCallId } from "@celesta/types";
import { useStore } from "../store";
import { UIMessageRepr } from "../types";

export function useUIMessages(contextId: ContextId) {
  const messagesByContext = useStore((store) => store.messagesByContext);

  return useMemo(() => {
    const result: UIMessageRepr[] = [];
    const resultIndexByToolCallId: Record<ToolCallId, number> = {};

    for (const msg of messagesByContext[contextId] ?? []) {
      if (msg.type === "USER_MESSAGE") {
        result.push({ type: "user", content: msg.content });
      } else if (msg.type === "AGENT_MESSAGE") {
        result.push({ type: "agent", content: msg.content, messageType: msg.messageType });
      } else if (msg.type === "TOOL_INVOCATION") {
        resultIndexByToolCallId[msg.toolCallId] = result.length;

        result.push({
          type: "tool",
          toolName: msg.toolName,
          input: msg.input,
          output: null,
        });
      } else if (msg.type === "TOOL_RESULT") {
        // Find the corresponding tool invocation to update its output
        const index = resultIndexByToolCallId[msg.toolCallId];
        if (index != null && result[index].type === "tool") {
          result[index].output = msg.output;
        }
      }
    }

    const lastMessage = messagesByContext[contextId]?.at(-1);

    if (lastMessage?.type === "REQUEST_SHOULD_START_WORKFLOW") {
      result.push({
        type: "workflow-request",
        prompt: lastMessage.suggestedPrompt,
        requestId: lastMessage.requestId,
      });
    }

    return result;
  }, [messagesByContext[contextId]]);
}
