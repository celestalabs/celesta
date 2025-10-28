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

  const handleSendMessage = useCallback(() => {
    if (!chatInput.trim()) return;

    sendMessage({
      type: "USER_MESSAGE",
      content: chatInput.trim(),
      contextId: "CHAT",
    });

    setChatInput("");
  }, [sendMessage, chatInput]);

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
