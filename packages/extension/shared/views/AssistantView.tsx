import { FrontendWSMessage, ToolCallId, WSMessage } from "@celesta/types";
import React from "react";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { UIMessageRepr } from "../types";
import { MessageCard } from "../components/MessageCard";
import { useStore } from "../store";

type Props = {
  sendMessage: (message: FrontendWSMessage) => void;
};

export const AssistantView = React.memo(({ sendMessage }: Props) => {
  const [chatInput, setChatInput] = useState("");
  const messagesByContext = useStore((store) => store.messagesByContext);

  const handleSendUserMessage = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!chatInput.trim()) return;

      sendMessage({
        type: "USER_MESSAGE",
        content: chatInput.trim(),
        contextId: "CHAT",
      });

      setChatInput("");
    },
    [sendMessage, chatInput]
  );

  const chatMessages = useMemo(() => {
    const result: UIMessageRepr[] = [];
    const resultIndexByToolCallId: Record<ToolCallId, number> = {};

    for (const msg of messagesByContext["CHAT"] ?? []) {
      if (msg.type === "USER_MESSAGE") {
        result.push({ type: "user", content: msg.content });
      } else if (msg.type === "AGENT_MESSAGE") {
        result.push({ type: "agent", content: msg.content });
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

    const lastMessage = messagesByContext["CHAT"]?.at(-1);

    if (lastMessage?.type === "REQUEST_SHOULD_START_WORKFLOW") {
      result.push({
        type: "workflow-request",
        prompt: lastMessage.content,
        requestId: lastMessage.requestId,
      });
    }

    return result;
  }, [messagesByContext["CHAT"]]);

  return (
    <>
      <div className="flex-auto flex flex-col gap-4 overflow-y-auto px-4">
        {chatMessages.length === 0 && (
          <h1 className="text-xl text-center">How's it going?</h1>
        )}

        {chatMessages.map((msg, index) => (
          <MessageCard key={index} message={msg} sendMessage={sendMessage} />
        ))}
      </div>

      <form className="flex gap-2 px-4" onSubmit={handleSendUserMessage}>
        <Input
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="Type a message..."
        />
        <Button type="submit">Send</Button>
      </form>
    </>
  );
});
