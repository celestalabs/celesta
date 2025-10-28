import React from "react";
import { createRoot } from "react-dom/client";
import "./styles/globals.css";
import { Input } from "./components/ui/input";
import { Button } from "./components/ui/button";
import { useAgentServer } from "./hooks/useAgentServer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { useOAuth } from "./hooks/useOAuth";
import { RequestId } from "@celesta/types";

const App = React.memo(() => {
  const [chatInput, setChatInput] = useState("");

  const { handleOAuthFlow } = useOAuth();

  const { sendMessage, messages } = useAgentServer({
    AGENT_MESSAGE: (message) => {},
    TOOL_INVOCATION: (message) => {},
    TOOL_RESULT: (message) => {},
    REQUEST_CREDENTIALS: useCallback(
      async ({ integrationName, requestId }, send) => {
        const accessToken = await handleOAuthFlow(integrationName);
        if (accessToken != null) {
          send({
            type: "PROVIDE_CREDENTIALS",
            integrationName,
            requestId,
            accessToken,
          });
        }
      },
      [handleOAuthFlow]
    ),
    REQUEST_QUESTION_RESPONSE: (message) => {},
    REQUEST_SHOULD_START_WORKFLOW: (message) => {},
  });

  const handleSendMessage = useCallback(
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

  const chatMessages = useMemo(
    () =>
      messages.filter((msg) => "contextId" in msg && msg.contextId === "CHAT"),
    [messages]
  );

  return (
    <div className="h-full p-4 flex flex-col gap-4">
      <h1 className="text-xl text-center">How's it going?</h1>

      <div className="flex-auto flex flex-col gap-4 overflow-y-auto">
        {messages.map((msg, index) => (
          <Card key={index}>
            <CardContent>
              <pre className="wrap-break-word whitespace-pre-wrap">
                {JSON.stringify(msg, null, 2)}
              </pre>
            </CardContent>
          </Card>
        ))}
      </div>

      <form className="flex gap-2" onSubmit={handleSendMessage}>
        <Input
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="Type a message..."
        />
        <Button type="submit">Send</Button>
      </form>
    </div>
  );
});

createRoot(document.getElementById("root")!).render(<App />);
