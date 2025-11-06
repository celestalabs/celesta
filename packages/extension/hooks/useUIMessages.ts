import {
  type ContextId,
  type ToolCallId,
  type UIWorkflowTask,
  type WSMessage,
  isWorkflowId,
} from "@celesta/common";
import { useStore } from "~/store";
import { type UIMessageRepr } from "~/types";

export function useUIMessages(contextId: ContextId) {
  const messagesByContext = useStore((store) => store.messagesByContext);
  const streamedMessageByContext = useStore(
    (store) => store.streamedMessageByContext
  );
  const tasksByWorkflow = useStore((store) => store.tasksByWorkflow);

  const messages = messagesByContext[contextId];
  const tasks = isWorkflowId(contextId)
    ? tasksByWorkflow[contextId]
    : undefined;

  const streamedMessage = streamedMessageByContext[contextId];

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
        result.push({ type: "user", content: msg.data.content as string });
      } else if (msg.type === "AGENT_MESSAGE") {
        result.push({
          type: "agent",
          content: msg.data.content as string,
          messageType: msg.messageType,
        });
      } else if (msg.type === "TOOL_INVOCATION") {
        resultIndexByToolCallId[msg.toolCallId] = result.length;

        result.push({
          type: "tool",
          toolCallId: msg.toolCallId,
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

    // tmp streamed message
    if (streamedMessage != null && streamedMessage.data.content.length > 0) {
      result.push({
        type: "agent",
        messageType: streamedMessage.messageType,
        content: streamedMessage.data.content as string,
      });
    }

    // workflow request
    if (lastMessage?.type === "REQUEST_SHOULD_START_WORKFLOW") {
      result.push({
        type: "workflow-request",
        prompt: lastMessage.suggestedPrompt,
        requestId: lastMessage.requestId,
      });
    }

    return [result, streamedMessage?.data.content.length ?? 0] as const;
  }, [messages, tasks, streamedMessage]);
}
