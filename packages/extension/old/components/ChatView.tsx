import React, { useState } from "react";
import { PendingIntent } from "../hooks/types";
import { WSMessage } from "../hooks/websocketManager";
import { CredentialRequest } from "./CredentialRequest";
import { MessagePanel } from "./MessagePanel";
import { WorkflowIntentPrompt } from "./WorkflowIntentPrompt";

export interface ChatViewProps {
  messages: WSMessage[];
  pendingIntent: PendingIntent | null;
  pendingCredentialRequest?: {
    messageId: string;
    integrationName: string;
  } | null;
  onSendMessage: (content: string) => void;
  onStartWorkflow: (prompt: string) => void;
  onDismissIntent: () => void;
  onApproveCredentials?: (messageId: string, integrationName: string) => void;
  onRejectCredentials?: (integrationName: string) => void;
}

export function ChatView({
  messages,
  pendingIntent,
  pendingCredentialRequest,
  onSendMessage,
  onStartWorkflow,
  onDismissIntent,
  onApproveCredentials,
  onRejectCredentials,
}: ChatViewProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput("");
    }
  };

  // Filter out credential request/provide messages for display
  const filteredMessages = messages.filter(
    (msg) =>
      msg.type !== "request_credentials" && msg.type !== "provide_credentials"
  );

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <MessagePanel messages={filteredMessages} />

        {/* Workflow Intent Prompt */}
        {pendingIntent && (
          <div className="p-4 border-t border-gray-200">
            <WorkflowIntentPrompt
              intent={pendingIntent}
              onStartWorkflow={onStartWorkflow}
              onDismiss={onDismissIntent}
            />
          </div>
        )}

        {/* Credential Request Prompt */}
        {pendingCredentialRequest && onApproveCredentials && (
          <div className="p-4 border-t border-gray-200">
            <CredentialRequest
              request={pendingCredentialRequest}
              onApprove={onApproveCredentials}
              onReject={
                onRejectCredentials
                  ? (_id, integrationName) =>
                      onRejectCredentials(integrationName)
                  : () => {}
              }
            />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message or describe a task..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
