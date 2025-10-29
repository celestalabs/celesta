import {
  ContextId,
  ToolCallId,
  UIWorkflowTask,
  WSMessage,
} from "@celesta/common";
import { useStore } from "../store";
import { UIMessageRepr } from "../types";

export function useUIMessages(contextId: ContextId) {
  const messagesByContext = useStore((store) => store.messagesByContext);
  const tasksByWorkflow = useStore((store) => store.tasksByWorkflow);

  const messages = messagesByContext[contextId];
  const tasks = contextId === "CHAT" ? undefined : tasksByWorkflow[contextId];

  return useMemo(() => {
    const result: UIMessageRepr[] = [];
    const resultIndexByToolCallId: Record<ToolCallId, number> = {};

    const allMessages: (WSMessage | UIWorkflowTask)[] = [
      ...(messages ?? []),
      ...(tasks ?? []),
    ].toSorted((a, b) => a.timestamp - b.timestamp);

    for (const msg of allMessages) {
      if (msg.type === "UI_WORKFLOW_TASK") {
        result.push({
          type: "workflow-task",
          slug: msg.slug,
          description: msg.description,
          status: msg.status,
        });
      } else if (msg.type === "USER_MESSAGE") {
        result.push({ type: "user", content: msg.content });
      } else if (msg.type === "AGENT_MESSAGE") {
        result.push({
          type: "agent",
          content: msg.content,
          messageType: msg.messageType,
        });
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

    const lastMessage = messages?.at(-1);

    if (lastMessage?.type === "REQUEST_SHOULD_START_WORKFLOW") {
      result.push({
        type: "workflow-request",
        prompt: lastMessage.suggestedPrompt,
        requestId: lastMessage.requestId,
      });
    }

    return result;
  }, [messages, tasks]);
}
