import { FrontendWSMessage, ToolCallId, WSMessage } from "@celesta/types";
import React from "react";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { UIMessageRepr } from "../types";
import { MessageCard } from "../components/MessageCard";
import { useAutoScrollToBottom } from "../hooks/useAutoScrollToBottom";
import { useUIMessages } from "../hooks/useUIMessages";

type Props = {
  sendMessage: (message: FrontendWSMessage) => void;
};

export const AssistantView = React.memo(({ sendMessage }: Props) => {
  const [chatInput, setChatInput] = useState("");

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

  const chatMessages = useUIMessages("CHAT");

  // Auto-scroll logic
  const scrollRef = useAutoScrollToBottom(chatMessages.length);

  return (
    <>
      <div ref={scrollRef} className="flex-auto flex flex-col gap-4 overflow-y-auto px-4">
        {chatMessages.length === 0 && (
          <h1 className="text-xl text-center">How's it going?</h1>
        )}

        {chatMessages.map((msg, index) => (
          <MessageCard contextId="CHAT" key={index} message={msg} sendMessage={sendMessage} />
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
