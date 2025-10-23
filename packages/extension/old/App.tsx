import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { ChatView } from "./components/ChatView";
import { ConnectionStatus } from "./components/ConnectionStatus";
import { LoadingScreen } from "./components/LoadingScreen";
import { TabbedLayout } from "./components/TabbedLayout";
import { WorkflowDetailView } from "./components/WorkflowDetailView";
import { WorkflowsView } from "./components/WorkflowsView";
import { useChatStore, useWorkflowsStore, useAppStore } from "./hooks/stores";
import { useOAuth } from "./hooks/useOAuth";
import { connectWebSocket, sendMessage } from "./hooks/websocketManager";

const WS_URL = "ws://localhost:8081";
const INTEGRATION_API_URL = "http://localhost:8080";

const App = React.memo(function AppFn() {
  // OAuth handler
  const { handleOAuthFlow } = useOAuth(INTEGRATION_API_URL);

  // Zustand stores
  const messages = useChatStore((s) => s.messages);
  const pendingIntent = useChatStore((s) => s.pendingIntent);
  const pendingCredentialRequest = useChatStore(
    (s) => s.pendingCredentialRequest
  );
  const addUserMessage = useChatStore((s) => s.addUserMessage);
  const clearIntent = useChatStore((s) => s.clearIntent);

  const getWorkflow = useWorkflowsStore((s) => s.getWorkflow);
  const getRunningWorkflows = useWorkflowsStore((s) => s.getRunningWorkflows);
  const getCompletedWorkflows = useWorkflowsStore(
    (s) => s.getCompletedWorkflows
  );

  const currentView = useAppStore((s) => s.currentView);
  const selectedWorkflowId = useAppStore((s) => s.selectedWorkflowId);
  const setView = useAppStore((s) => s.setView);

  const isConnected = useAppStore((s) => s.connected);

  // Connect WebSocket on mount
  useEffect(() => {
    connectWebSocket(WS_URL);
  }, []);

  // Show loading while connecting
  if (!isConnected) {
    return <LoadingScreen />;
  }

  // Tab logic
  const activeTab = currentView === "chat" ? "chat" : "workflows";
  const handleTabChange = (tab: "chat" | "workflows") => {
    if (tab === "chat") setView("chat");
    else setView("workflows-list");
  };

  // Actions
  const handleSendMessage = (content: string) => {
    const msg = {
      id: crypto.randomUUID(),
      type: "chat_message",
      content,
      sender: "user",
      timestamp: new Date(),
    };
    addUserMessage(msg);
    sendMessage(msg);
  };

  const handleStartWorkflow = (prompt: string) => {
    const msg = {
      id: crypto.randomUUID(),
      type: "start_workflow",
      content: `Starting workflow: ${prompt}`,
      sender: "user",
      timestamp: new Date(),
      prompt,
    };
    sendMessage(msg);
    clearIntent();
  };

  const handleAnswerQuestion = (
    messageId: string,
    workflowId: string,
    answer: string
  ) => {
    const msg = {
      id: messageId,
      type: "answer",
      content: answer,
      sender: "user",
      timestamp: new Date(),
      workflowId,
    };
    sendMessage(msg);
  };

  const handleProvideCredentials = (
    messageId: string,
    workflowId: string,
    integrationName: string,
    accessToken: string
  ) => {
    const msg = {
      id: messageId,
      type: "provide_credentials",
      content: `Providing credentials for ${integrationName}`,
      sender: "user",
      timestamp: new Date(),
      workflowId,
      integrationName,
      accessToken,
    };
    sendMessage(msg);
  };

  // OAuth flow integration for chat
  const handleChatCredentialApprove = async (
    messageId: string,
    integrationName: string
  ) => {
    try {
      const accessToken = await handleOAuthFlow(integrationName);
      if (accessToken) {
        handleProvideCredentials(
          messageId,
          "CHAT",
          integrationName,
          accessToken
        );
      }
    } catch (error) {
      console.error("OAuth flow failed:", error);
    }
  };

  // OAuth flow integration for workflows
  const handleCredentialApprove = async (
    messageId: string,
    workflowId: string,
    integrationName: string
  ) => {
    try {
      const accessToken = await handleOAuthFlow(integrationName);
      if (accessToken) {
        handleProvideCredentials(
          messageId,
          workflowId,
          integrationName,
          accessToken
        );
      }
    } catch (error) {
      console.error("OAuth flow failed:", error);
    }
  };

  const handleCredentialReject = (
    workflowId: string,
    integrationName: string
  ) => {
    // Send error message or handle rejection
    console.log(`Credentials rejected for ${integrationName}`);
  };

  // Render content based on current view
  const renderContent = () => {
    if (currentView === "chat") {
      return (
        <ChatView
          messages={messages}
          pendingIntent={pendingIntent}
          pendingCredentialRequest={pendingCredentialRequest}
          onSendMessage={handleSendMessage}
          onStartWorkflow={handleStartWorkflow}
          onDismissIntent={clearIntent}
          onApproveCredentials={handleChatCredentialApprove}
        />
      );
    }
    if (currentView === "workflow-detail" && selectedWorkflowId) {
      const workflow = getWorkflow(selectedWorkflowId);
      if (!workflow) {
        setView("workflows-list");
        return null;
      }
      return (
        <WorkflowDetailView
          workflow={workflow}
          onBack={() => setView("workflows-list")}
          onAnswerQuestion={handleAnswerQuestion}
          onApproveCredentials={handleCredentialApprove}
          onRejectCredentials={handleCredentialReject}
        />
      );
    }
    // Default: workflows-list view
    return (
      <WorkflowsView
        runningWorkflows={getRunningWorkflows()}
        completedWorkflows={getCompletedWorkflows()}
        onSelectWorkflow={(id) => setView("workflow-detail", id)}
      />
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <ConnectionStatus connected={isConnected} />
      <TabbedLayout activeTab={activeTab} onTabChange={handleTabChange}>
        {renderContent()}
      </TabbedLayout>
    </div>
  );
});

const root = document.getElementById("root");
root != null && createRoot(root).render(<App />);
