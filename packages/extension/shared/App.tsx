import React from "react";
import { createRoot } from "react-dom/client";
import "./styles/globals.css";
import { Button } from "./components/ui/button";
import { useAgentServer } from "./hooks/useAgentServer";
import { useOAuth } from "./hooks/useOAuth";
import { ButtonGroup } from "./components/ui/button-group";
import { AssistantView } from "./views/AssistantView";
import { WorkflowListView } from "./views/WorkflowListView";
import { WorkflowView } from "./views/WorkflowView";
import { useStore } from "./store";
import { Toaster } from "sonner";

const App = React.memo(() => {
  const { handleOAuthFlow } = useOAuth();

  const { sendMessage } = useAgentServer({
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
    REQUEST_QUESTION_RESPONSE: (message, send) => {
      const response = prompt("Celesta asks:", message.question);
      send({
        type: "PROVIDE_QUESTION_RESPONSE",
        requestId: message.requestId,
        response: response || "",
        contextId: message.contextId,
      });
    },
    REQUEST_SHOULD_START_WORKFLOW: (message) => {},
    CONTEXT_CREATED: (message) => {},
    WORKFLOW_STATUS_CHANGED: (message) => {},
    WORKFLOW_TASK_STATUS_CHANGED: (message) => {},
  });

  const currentView = useStore((state) => state.currentView);
  const routeToView = useStore((state) => state.routeToView);

  return (
    <>
      <Toaster />
      <div className="h-full py-4 flex flex-col gap-5">
        <ButtonGroup className="flex w-full px-4">
          <Button
            className="flex-auto"
            variant={currentView === "CHAT" ? "default" : "secondary"}
            onClick={() => routeToView("CHAT")}
          >
            Assistant
          </Button>
          <Button
            className="flex-auto"
            variant={currentView !== "CHAT" ? "default" : "secondary"}
            onClick={() => routeToView("WORKFLOW_LIST")}
          >
            Workflows
          </Button>
        </ButtonGroup>

        {currentView === "CHAT" ? (
          <AssistantView sendMessage={sendMessage} />
        ) : currentView === "WORKFLOW_LIST" ? (
          <WorkflowListView />
        ) : (
          <WorkflowView sendMessage={sendMessage} />
        )}
      </div>
    </>
  );
});

createRoot(document.getElementById("root")!).render(<App />);
