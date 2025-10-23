import React from "react";
import { WorkflowState } from "../hooks/types";
import { CredentialRequest } from "./CredentialRequest";
import { MessagePanel } from "./MessagePanel";
import { QuestionPrompt } from "./QuestionPrompt";

export interface WorkflowDetailViewProps {
  workflow: WorkflowState;
  onBack: () => void;
  onAnswerQuestion: (messageId: string, workflowId: string, answer: string) => void;
  onApproveCredentials: (
    messageId: string,
    workflowId: string,
    integrationName: string
  ) => void;
  onRejectCredentials: (workflowId: string, integrationName: string) => void;
}

export function WorkflowDetailView({
  workflow,
  onBack,
  onAnswerQuestion,
  onApproveCredentials,
  onRejectCredentials,
}: WorkflowDetailViewProps) {
  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  };

  const getDuration = () => {
    if (!workflow.completedAt) {
      return "In progress...";
    }

    const ms = workflow.completedAt.getTime() - workflow.startedAt.getTime();
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const getStatusBadge = () => {
    const badges = {
      running: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
    };

    return (
      <span
        className={`px-3 py-1 text-sm font-medium rounded ${badges[workflow.status]}`}
      >
        {workflow.status.charAt(0).toUpperCase() + workflow.status.slice(1)}
      </span>
    );
  };

  // Convert workflow messages to DisplayMessage format for MessagePanel
  const displayMessages = workflow.messages.map((msg) => ({
    ...msg,
    timestamp: new Date(msg.timestamp),
  }));

  const handleAnswerSubmit = (messageId: string, answer: string) => {
    onAnswerQuestion(messageId, workflow.id, answer);
  };

  const handleApproveCredentials = (messageId: string, integrationName: string) => {
    // Trigger OAuth flow with the original message ID for proper response matching
    onApproveCredentials(messageId, workflow.id, integrationName);
  };

  const handleRejectCredentials = (_id: string, integrationName: string) => {
    onRejectCredentials(workflow.id, integrationName);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <button
          onClick={onBack}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-3 transition-colors"
        >
          <span className="mr-1">←</span>
          Back to Workflows
        </button>

        <div className="flex items-start justify-between mb-2">
          <h2 className="text-xl font-bold text-gray-900 flex-1 pr-4">
            {workflow.prompt}
          </h2>
          {getStatusBadge()}
        </div>

        <div className="text-sm text-gray-600 space-y-1">
          <p>Started: {formatTimestamp(workflow.startedAt)}</p>
          <p>Duration: {getDuration()}</p>
          <p>{workflow.messages.length} messages</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <MessagePanel messages={displayMessages} />
      </div>

      {/* Interactive Prompts */}
      {workflow.pendingQuestion && (
        <QuestionPrompt
          question={{
            id: workflow.pendingQuestion.messageId,
            content: workflow.pendingQuestion.question,
          }}
          onSubmit={handleAnswerSubmit}
        />
      )}

      {workflow.pendingCredentialRequest && (
        <CredentialRequest
          request={{
            id: workflow.pendingCredentialRequest.messageId,
            integrationName: workflow.pendingCredentialRequest.integrationName,
          }}
          onApprove={handleApproveCredentials}
          onReject={handleRejectCredentials}
        />
      )}
    </div>
  );
}
