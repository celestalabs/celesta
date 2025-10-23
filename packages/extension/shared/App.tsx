import React from "react";
import { createRoot } from "react-dom/client";
import { ChatView } from "./components/ChatView";
import { ConnectionStatus } from "./components/ConnectionStatus";
import { LoadingScreen } from "./components/LoadingScreen";
import { TabbedLayout } from "./components/TabbedLayout";
import { WorkflowDetailView } from "./components/WorkflowDetailView";
import { WorkflowsView } from "./components/WorkflowsView";
import { useAppState } from "./hooks/useAppState";
import { useOAuth } from "./hooks/useOAuth";

const WS_URL = "ws://localhost:8081";
const INTEGRATION_API_URL = "http://localhost:8080";

const App = React.memo(function AppFn() {
  // OAuth handler
  const { handleOAuthFlow } = useOAuth(INTEGRATION_API_URL);

  // Application state management (combines chat + workflows)
  const {
    appState,
    chatState,
    workflowsState,
    connected,
    switchToChat,
    switchToWorkflowsList,
    focusWorkflow,
    backToWorkflowsList,
    startWorkflow,
    answerQuestion,
    provideCredentials,
  } = useAppState({ websocketUrl: WS_URL });

  // OAuth flow integration for chat
  const handleChatCredentialApprove = React.useCallback(
    async (messageId: string, integrationName: string) => {
      try {
        const accessToken = await handleOAuthFlow(integrationName);
        if (accessToken) {
          provideCredentials(messageId, "CHAT", integrationName, accessToken);
        }
      } catch (error) {
        console.error("OAuth flow failed:", error);
      }
    },
    [handleOAuthFlow, provideCredentials]
  );

  // OAuth flow integration for workflows
  const handleCredentialApprove = React.useCallback(
    async (messageId: string, workflowId: string, integrationName: string) => {
      try {
        const accessToken = await handleOAuthFlow(integrationName);
        if (accessToken) {
          provideCredentials(
            messageId,
            workflowId,
            integrationName,
            accessToken
          );
        }
      } catch (error) {
        console.error("OAuth flow failed:", error);
      }
    },
    [handleOAuthFlow, provideCredentials]
  );

  const handleCredentialReject = React.useCallback(
    (workflowId: string, integrationName: string) => {
      // Send error message or handle rejection
      console.log(`Credentials rejected for ${integrationName}`);
    },
    []
  );

  // Show loading while connecting
  if (!connected) {
    return <LoadingScreen />;
  }

  // Determine which tab is active
  const activeTab = appState.currentView === "chat" ? "chat" : "workflows";

  // Handle tab changes
  const handleTabChange = (tab: "chat" | "workflows") => {
    if (tab === "chat") {
      switchToChat();
    } else {
      switchToWorkflowsList();
    }
  };

  // Render content based on current view
  const renderContent = () => {
    if (appState.currentView === "chat") {
      return (
        <ChatView
          messages={chatState.messages}
          pendingIntent={chatState.pendingIntent}
          pendingCredentialRequest={chatState.pendingCredentialRequest}
          onSendMessage={chatState.addUserMessage}
          onStartWorkflow={(prompt) => {
            startWorkflow(prompt);
            // Don't navigate here - wait for workflow_started message
            // which will automatically navigate to the workflow detail view
          }}
          onDismissIntent={chatState.clearIntent}
          onApproveCredentials={handleChatCredentialApprove}
        />
      );
    }

    if (
      appState.currentView === "workflow-detail" &&
      appState.selectedWorkflowId
    ) {
      const workflow = workflowsState.getWorkflow(appState.selectedWorkflowId);
      if (!workflow) {
        // Workflow not found, go back to list
        backToWorkflowsList();
        return null;
      }

      return (
        <WorkflowDetailView
          workflow={workflow}
          onBack={backToWorkflowsList}
          onAnswerQuestion={answerQuestion}
          onApproveCredentials={handleCredentialApprove}
          onRejectCredentials={handleCredentialReject}
        />
      );
    }

    // Default: workflows-list view
    return (
      <WorkflowsView
        runningWorkflows={workflowsState.getRunningWorkflows()}
        completedWorkflows={workflowsState.getCompletedWorkflows()}
        onSelectWorkflow={focusWorkflow}
      />
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <ConnectionStatus connected={connected} />
      <TabbedLayout activeTab={activeTab} onTabChange={handleTabChange}>
        {renderContent()}
      </TabbedLayout>
    </div>
  );
});

const root = document.getElementById("root");
root != null && createRoot(root).render(<App />);
