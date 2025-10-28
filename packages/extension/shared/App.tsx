import React from "react";
import { createRoot } from "react-dom/client";
import "./styles/globals.css";
import { Input } from "./components/ui/input";
import { Button } from "./components/ui/button";
import { useAgentServer } from "./hooks/useAgentServer";

const App = React.memo(() => {
  const [chatInput, setChatInput] = useState("");

  const { sendMessage, messages } = useAgentServer({
    AGENT_MESSAGE: (message) => {},
    TOOL_INVOCATION: (message) => {},
    TOOL_RESULT: (message) => {},
    REQUEST_CREDENTIALS: (message) => {},
    REQUEST_QUESTION_RESPONSE: (message) => {},
    REQUEST_SHOULD_START_WORKFLOW: (message) => {},
  });

  const handleSendMessage = useCallback(() => {
    sendMessage({
      type: "USER_MESSAGE",
      content: chatInput,
      contextId: "CHAT",
    });
  }, [sendMessage, chatInput]);

  return (
    <div className="h-full p-4 flex flex-col gap-4">
      <h1 className="text-xl text-center">How's it going?</h1>

      <div className="flex-auto">
        {messages.map((msg, index) => (
          <div key={index} className="mb-2">
            {JSON.stringify(msg)}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="Type a message..."
        />
        <Button onClick={handleSendMessage}>Send</Button>
      </div>
    </div>
  );
});

createRoot(document.getElementById("root")!).render(<App />);
