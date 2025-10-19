import React from "react";
import { createRoot } from "react-dom/client";
import { ConnectionStatus } from "../../shared/components/ConnectionStatus";
import { LoadingScreen } from "../../shared/components/LoadingScreen";
import { MessagePanel } from "../../shared/components/MessagePanel";
import { QuestionPrompt } from "../../shared/components/QuestionPrompt";
import { WorkflowInput } from "../../shared/components/WorkflowInput";
import { useOAuth } from "../../shared/hooks/useOAuth";
import { useWebSocket } from "../../shared/hooks/useWebSocket";
import { useWorkflowState } from "../../shared/hooks/useWorkflowState";

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
      <WorkflowInput onExecute={workflowState.executeWorkflow} />
    </div>
  );
});

const root = document.getElementById("root");
root != null && createRoot(root).render(<App />);
