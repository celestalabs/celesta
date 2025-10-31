import { ts } from "@celesta/common";
import React from "react";
import { createRoot } from "react-dom/client";
import "./styles/globals.css";
import { toast, Toaster } from "sonner";
import { Button } from "./components/ui/button";
import { ButtonGroup } from "./components/ui/button-group";
import { useAgentServer } from "./hooks/useAgentServer";
import { useOAuth } from "./hooks/useOAuth";
import { useStore } from "./store";
import { browserContextActions } from "./utils/browserContextActions";
import { AssistantView } from "./views/AssistantView";
import { WorkflowListView } from "./views/WorkflowListView";
import { WorkflowView } from "./views/WorkflowView";

const App = React.memo(() => {
  const { handleOAuthFlow } = useOAuth();

  const { sendMessage } = useAgentServer({
    AGENT_MESSAGE: () => {},
    TOOL_INVOCATION: () => {},
    TOOL_RESULT: () => {},
    REQUEST_CREDENTIALS: useCallback(
      async ({ integrationName, requestId }, send) => {
        const accessToken = await handleOAuthFlow(integrationName);
        if (accessToken != null) {
          send(
            ts({
              type: "PROVIDE_CREDENTIALS",
              integrationName,
              requestId,
              accessToken,
            })
          );
        }
      },
      [handleOAuthFlow]
    ),

    REQUEST_QUESTION_RESPONSE: (message, send) => {
      const response = prompt("Celesta asks: " + message.question);
      send(
        ts({
          type: "PROVIDE_QUESTION_RESPONSE",
          requestId: message.requestId,
          response: response || "",
          contextId: message.contextId,
        })
      );
    },

    REQUEST_SHOULD_START_WORKFLOW: () => {},
    CONTEXT_CREATED: () => {},

    // Show toast for workflow status changes
    WORKFLOW_STATUS_CHANGED: (message) => {
      // Don't show if user is already viewing the workflow
      if (currentView === message.workflowId) return;

      const toastConfig = {
        action: {
          label: "View",
          onClick: () => routeToView(message.workflowId),
        },
        position: "top-center",
      } as const;

      switch (message.status) {
        case "failed": {
          toast.error("Workflow failed! :(", {
            ...toastConfig,
            description: "Something went wrong during execution.",
          });
          break;
        }
        case "completed": {
          toast.success(`Workflow completed!`, {
            description: "Take a peek at what happened.",
            ...toastConfig,
          });
          break;
        }
        case "running": {
          toast.info("Workflow created!", {
            description: `It's running as we speak.`,
            ...toastConfig,
          });
          break;
        }
      }
    },

    WORKFLOW_TASK_STATUS_CHANGED: () => {},

    REQUEST_BROWSER_CONTEXT_ACTION: async ({ action, requestId }, send) => {
      send(
        ts({
          type: "PROVIDE_BROWSER_CONTEXT_ACTION",
          requestId,
          response: await browserContextActions[action.type](action as any),
        })
      );
    },
  });

  const currentView = useStore((state) => state.currentView);
  const routeToView = useStore((state) => state.routeToView);

  return (
    <>
      <Toaster />
      <div className="h-full py-4 flex flex-col gap-4">
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
