import React from "react";
import { PendingIntent } from "../hooks/types";

export interface WorkflowIntentPromptProps {
  intent: PendingIntent;
  onStartWorkflow: (prompt: string) => void;
  onDismiss: () => void;
}

export function WorkflowIntentPrompt({
  intent,
  onStartWorkflow,
  onDismiss,
}: WorkflowIntentPromptProps) {
  const confidenceColors = {
    high: "bg-green-50 border-green-200",
    medium: "bg-yellow-50 border-yellow-200",
    low: "bg-gray-50 border-gray-200",
  };

  const confidenceBadgeColors = {
    high: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    low: "bg-gray-100 text-gray-800",
  };

  return (
    <div
      className={`p-4 rounded-lg border-2 ${confidenceColors[intent.confidence]}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <h3 className="font-semibold text-gray-900">Workflow Detected</h3>
          <span
            className={`px-2 py-1 text-xs font-medium rounded ${confidenceBadgeColors[intent.confidence]}`}
          >
            {intent.confidence} confidence
          </span>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-3">{intent.reasoning}</p>

      <div className="bg-white p-3 rounded border border-gray-200 mb-3">
        <p className="text-sm font-medium text-gray-700 mb-1">
          Suggested workflow:
        </p>
        <p className="text-sm text-gray-900">{intent.suggestedPrompt}</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onStartWorkflow(intent.suggestedPrompt)}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
        >
          Start Workflow
        </button>
        <button
          onClick={onDismiss}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
        >
          Continue Chatting
        </button>
      </div>
    </div>
  );
}
