import React from "react";
import { createRoot } from "react-dom/client";
import "./styles/globals.css";
import { Input } from "./components/ui/input";
import { Button } from "./components/ui/button";
import { useAgentServer } from "./hooks/useAgentServer";
import { Card, CardContent } from "./components/ui/card";
import { useOAuth } from "./hooks/useOAuth";
import { ButtonGroup } from "./components/ui/button-group";
import { ContextId } from "@celesta/types";
import { AssistantView } from "./views/AssistantView";
import { WorkflowListView } from "./views/WorkflowListView";
import { WorkflowView } from "./views/WorkflowView";

const App = React.memo(() => {
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

  const [currentTab, setCurrentTab] = useState<ContextId | "WORKFLOW_LIST">(
    "CHAT"
  );

  return (
    <div className="h-full py-4 flex flex-col gap-5">
      <ButtonGroup className="flex w-full px-4">
        <Button
          className="flex-auto"
          variant={currentTab === "CHAT" ? "default" : "secondary"}
          onClick={() => setCurrentTab("CHAT")}
        >
          Assistant
        </Button>
        <Button
          className="flex-auto"
          variant={currentTab !== "CHAT" ? "default" : "secondary"}
          onClick={() => setCurrentTab("WORKFLOW_LIST")}
        >
          Workflows
        </Button>
      </ButtonGroup>
 
      {currentTab === "CHAT" ? (
        <AssistantView sendMessage={sendMessage} messages={messages} />
      ) : currentTab === "WORKFLOW_LIST" ? (
        <WorkflowListView />
      ) : (
        <WorkflowView />
      )}
    </div>
  );
});

createRoot(document.getElementById("root")!).render(<App />);
