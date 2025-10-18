import { createIntegrationApiClient } from "@celesta/integrations-api/client.js";
import { isIntegrationName } from "@celesta/integrations-api/integrations/integrationName";
import { PieceName } from "@celesta/integrations-api/pieces/pieceName.js";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { createRoot } from "react-dom/client";

const WS_URL = "ws://localhost:8081";
const INTEGRATION_API_URL = "http://localhost:8080";

const integrationApiClient = createIntegrationApiClient(INTEGRATION_API_URL);

interface WSMessage {
  id?: string;
  type: string;
  content: string;
  sender: string;
  timestamp: string;
  integrationName?: string;
  accessToken?: string;
  isQuestion?: boolean;
}

interface DisplayMessage {
  id: string;
  type: string;
  content: string;
  sender: string;
  timestamp: Date;
}

const App = React.memo(function AppFn() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [promptInput, setPromptInput] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState<{
    id: string;
    content: string;
  } | null>(null);
  const [answerInput, setAnswerInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // OAuth flow handler (from OAuth_oldApp.tsx)
  const handleOAuthFlow = useCallback(async (integrationName: string) => {
    if (!isIntegrationName(integrationName)) {
      console.error("Invalid integration name:", integrationName);
      return null;
    }

    try {
      const redirectUrl = browser.identity.getRedirectURL(integrationName);

      const state = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const responseUrlRes =
        await integrationApiClient.generateOAuthRedirectUrl({
          params: {
            pieceName: integrationName as PieceName,
            redirectUrl,
            state,
          },
        });

      if (!responseUrlRes.success) {
        console.error("Failed to get OAuth URL:", responseUrlRes.error);
        return null;
      }

      const responseUrl = await browser.identity.launchWebAuthFlow({
        url: responseUrlRes.url,
        interactive: true,
      });

      if (responseUrl == null) {
        console.error("OAuth flow was canceled or failed");
        return null;
      }

      const url = new URL(responseUrl);
      const code = url.searchParams.get("code");
      const responseState = url.searchParams.get("state");

      if (responseState !== state) {
        throw new Error("State mismatch - possible CSRF attack");
      }

      if (!code) {
        throw new Error("Authentication failed - no code returned");
      }

      const response = await integrationApiClient.generateOAuthAccessToken({
        body: {
          code,
          redirectUri: redirectUrl,
          pieceName: integrationName as PieceName,
        },
      });

      if (!response.success) {
        throw new Error(`Token exchange failed: ${response.error}`);
      }

      return response.accessToken;
    } catch (error) {
      console.error("OAuth flow error:", error);
      return null;
    }
  }, []);

  // Handle incoming WebSocket messages
  const handleIncomingMessage = useCallback(
    async (data: string) => {
      try {
        const message: WSMessage = JSON.parse(data);

        // Add to display messages (for all types)
        const displayMsg: DisplayMessage = {
          id: message.id || `msg_${Date.now()}`,
          type: message.type,
          content: message.content,
          sender: message.sender,
          timestamp: new Date(message.timestamp || Date.now()),
        };
        setMessages((prev) => [...prev, displayMsg]);

        // Handle specific message types
        if (message.type === "question" && message.id) {
          setPendingQuestion({ id: message.id, content: message.content });
        } else if (
          message.type === "request_credentials" &&
          message.integrationName
        ) {
          // Trigger OAuth flow
          const accessToken = await handleOAuthFlow(message.integrationName);

          if (accessToken && ws) {
            // Send credentials back
            const response = {
              id: message.id,
              type: "provide_credentials",
              integrationName: message.integrationName,
              accessToken,
              timestamp: new Date().toISOString(),
            };
            ws.send(JSON.stringify(response));
          }
        }
      } catch (error) {
        console.error("Error handling message:", error);
      }
    },
    [ws, handleOAuthFlow]
  );

  // Connect to WebSocket on mount
  useEffect(() => {
    const websocket = new WebSocket(WS_URL);

    websocket.onopen = () => {
      console.log("WebSocket connected");
      setConnected(true);
      setWs(websocket);
    };

    websocket.onmessage = (event) => {
      handleIncomingMessage(event.data);
    };

    websocket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    websocket.onclose = () => {
      console.log("WebSocket disconnected");
      setConnected(false);
    };

    return () => {
      websocket.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update handleIncomingMessage dependency when ws changes
  useEffect(() => {
    if (!ws) return;

    ws.onmessage = (event) => {
      handleIncomingMessage(event.data);
    };
  }, [ws, handleIncomingMessage]);

  // Send workflow prompt
  const handleExecuteWorkflow = useCallback(() => {
    if (!ws || !promptInput.trim()) return;

    const message = {
      type: "execute_workflow",
      prompt: promptInput,
    };

    ws.send(JSON.stringify(message));
    setPromptInput("");
  }, [ws, promptInput]);

  // Send answer to question
  const handleSubmitAnswer = useCallback(() => {
    if (!ws || !pendingQuestion || !answerInput.trim()) return;

    const message = {
      id: pendingQuestion.id,
      type: "answer",
      content: answerInput,
    };

    ws.send(JSON.stringify(message));
    setAnswerInput("");
    setPendingQuestion(null);
  }, [ws, pendingQuestion, answerInput]);

  // Show loading while connecting
  if (!connected) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
        }}
      >
        <div>Connecting to workflow server...</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Connection Status Bar */}
      <div
        style={{
          padding: "10px",
          background: connected ? "#4ade80" : "#f87171",
          color: "white",
          fontWeight: "bold",
          textAlign: "center",
        }}
      >
        {connected ? "🟢 Connected to Workflow Server" : "🔴 Disconnected"}
      </div>

      {/* Message Panel */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "10px",
          background: "#f9fafb",
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              marginBottom: "10px",
              padding: "8px",
              background:
                msg.type === "error"
                  ? "#fee2e2"
                  : msg.type === "status"
                    ? "#e0e7ff"
                    : msg.type === "final"
                      ? "#d1fae5"
                      : "white",
              borderLeft: `4px solid ${
                msg.type === "error"
                  ? "#ef4444"
                  : msg.type === "status"
                    ? "#6366f1"
                    : msg.type === "final"
                      ? "#10b981"
                      : "#9ca3af"
              }`,
              borderRadius: "4px",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                color: "#6b7280",
                marginBottom: "4px",
              }}
            >
              <strong>{msg.sender}</strong> • {msg.type} •{" "}
              {msg.timestamp.toLocaleTimeString()}
            </div>
            <div style={{ fontSize: "14px" }}>{msg.content}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Pending Question */}
      {pendingQuestion && (
        <div
          style={{
            padding: "10px",
            background: "#fef3c7",
            borderTop: "2px solid #fbbf24",
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
            ❓ Question from Agent:
          </div>
          <div style={{ marginBottom: "8px" }}>{pendingQuestion.content}</div>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              value={answerInput}
              onChange={(e) => setAnswerInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSubmitAnswer()}
              placeholder="Type your answer..."
              style={{
                flex: 1,
                padding: "8px",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
              }}
            />
            <button
              onClick={handleSubmitAnswer}
              disabled={!answerInput.trim()}
              style={{
                padding: "8px 16px",
                background: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: answerInput.trim() ? "pointer" : "not-allowed",
                opacity: answerInput.trim() ? 1 : 0.5,
              }}
            >
              Submit Answer
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div
        style={{
          padding: "10px",
          borderTop: "1px solid #e5e7eb",
          background: "white",
        }}
      >
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleExecuteWorkflow()}
            placeholder="Enter workflow prompt (e.g., 'Check my emails and summarize them')..."
            style={{
              flex: 1,
              padding: "12px",
              border: "2px solid #d1d5db",
              borderRadius: "4px",
              fontSize: "14px",
            }}
          />
          <button
            onClick={handleExecuteWorkflow}
            disabled={!promptInput.trim()}
            style={{
              padding: "12px 24px",
              background: "#10b981",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: promptInput.trim() ? "pointer" : "not-allowed",
              fontWeight: "bold",
              fontSize: "14px",
              opacity: promptInput.trim() ? 1 : 0.5,
            }}
          >
            Execute Workflow
          </button>
        </div>
      </div>
    </div>
  );
});

const root = document.getElementById("root");
root != null && createRoot(root).render(<App />);
