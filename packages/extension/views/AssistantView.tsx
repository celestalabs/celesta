import { type FrontendWSMessage, ts } from "@celesta/common";
import React from "react";
import { MessageCard } from "../components/MessageCard";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
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

      sendMessage(
        ts({
          type: "USER_MESSAGE",
          data: {
            role: "user",
            content: chatInput.trim(),
          },
          contextId: "CHAT",
        })
      );

      setChatInput("");
    },
    [sendMessage, chatInput]
  );

  const [chatMessages, streamedMessageLength] = useUIMessages("CHAT");

  const scrollDep = useMemo(
    () => [chatMessages.length, streamedMessageLength],
    [chatMessages.length, streamedMessageLength]
  );

  // Auto-scroll logic
  const scrollRef = useAutoScrollToBottom(scrollDep);

  return (
    <>
      <div
        ref={scrollRef}
        className="flex-auto flex flex-col gap-4 overflow-y-auto px-4"
      >
        {chatMessages.length === 0 && (
          <div className="flex-auto flex justify-center items-center">
            <h1 className="text-2xl mb-10 text-shadow-xs">
              How&apos;s it going?
            </h1>
          </div>
        )}

        {chatMessages.map((msg, index) => (
          <MessageCard
            contextId="CHAT"
            key={index}
            message={msg}
            sendMessage={sendMessage}
          />
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
