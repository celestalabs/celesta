import React from "react";
import { createRoot } from "react-dom/client";
import "./styles/globals.css";
import useWebSocket from "react-use-websocket";
import { Input } from "./components/ui/input";
import { Button } from "./components/ui/button";
import { useAgentServer } from "./hooks/useAgentServer";

const App = React.memo(() => {
  const { sendMessage } = useAgentServer({
    AGENT_MESSAGE: (message) => {},
    TOOL_INVOCATION: (message) => {},
    TOOL_RESULT: (message) => {},
    REQUEST_CREDENTIALS: (message) => {},
    REQUEST_QUESTION_RESPONSE: (message) => {},
    REQUEST_SHOULD_START_WORKFLOW: (message) => {},
  });

  return (
    <div className="h-full p-4 flex flex-col gap-4">
      <h1 className="text-xl text-center">Celesta Sidebar</h1>

      <div className="">
        <Input />
        <Button />
      </div>
    </div>
  );
});

createRoot(document.getElementById("root")!).render(<App />);
