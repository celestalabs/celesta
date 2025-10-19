import React from "react";
import { createRoot } from "react-dom/client";
import { ConnectionStatus } from "./components/ConnectionStatus";
import { CredentialRequest } from "./components/CredentialRequest";
import { LoadingScreen } from "./components/LoadingScreen";
import { MessagePanel } from "./components/MessagePanel";
import { QuestionPrompt } from "./components/QuestionPrompt";
import { WorkflowInput } from "./components/WorkflowInput";
import { useOAuth } from "./hooks/useOAuth";
import { useWebSocket } from "./hooks/useWebSocket";
import { useWorkflowState } from "./hooks/useWorkflowState";

const WS_URL = "ws://localhost:8081";
const INTEGRATION_API_URL = "http://localhost:8080";

const App = React.memo(function AppFn() {
  // OAuth handler
  const { handleOAuthFlow } = useOAuth(INTEGRATION_API_URL);

  // Workflow state management
  const workflowState = useWorkflowState({
    onRequestCredentials: handleOAuthFlow,
  });

  // WebSocket connection
  const { connected, sendMessage } = useWebSocket({
    url: WS_URL,
    onMessage: workflowState.handleIncomingMessage,
  });

  // Update sendMessage in workflow state
  React.useEffect(() => {
    if (sendMessage) {
      workflowState.setSendMessage(() => sendMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendMessage]);

  // Show loading while connecting
  if (!connected) {
    return <LoadingScreen />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <ConnectionStatus connected={connected} />
      <MessagePanel messages={workflowState.messages} />
      {workflowState.pendingQuestion && (
        <QuestionPrompt
          question={workflowState.pendingQuestion}
          onSubmit={workflowState.submitAnswer}
        />
      )}
      {workflowState.pendingCredentialRequest && (
        <CredentialRequest
          request={workflowState.pendingCredentialRequest}
          onApprove={workflowState.approveCredentials}
          onReject={workflowState.rejectCredentials}
        />
      )}
      <WorkflowInput
        onExecute={workflowState.executeWorkflow}
        disabled={workflowState.isExecuting && !workflowState.pendingQuestion}
      />
    </div>
  );
});

const root = document.getElementById("root");
root != null && createRoot(root).render(<App />);
