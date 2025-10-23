import React from "react";
import { WorkflowState } from "../hooks/types";

export interface WorkflowsViewProps {
  runningWorkflows: WorkflowState[];
  completedWorkflows: WorkflowState[];
  onSelectWorkflow: (workflowId: string) => void;
}

export function WorkflowsView({
  runningWorkflows,
  completedWorkflows,
  onSelectWorkflow,
}: WorkflowsViewProps) {
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return `Today at ${formatTime(date)}`;
    }

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  };

  const getStatusBadge = (status: WorkflowState["status"]) => {
    const badges = {
      running: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
    };

    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded ${badges[status]}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const renderWorkflowItem = (workflow: WorkflowState) => (
    <button
      key={workflow.id}
      onClick={() => onSelectWorkflow(workflow.id)}
      className="w-full text-left p-4 hover:bg-gray-50 border-b border-gray-200 transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <p className="font-medium text-gray-900 flex-1 pr-2">
          {workflow.prompt}
        </p>
        {getStatusBadge(workflow.status)}
      </div>
      <p className="text-sm text-gray-500">{formatDate(workflow.startedAt)}</p>
      <p className="text-sm text-gray-600 mt-1">
        {workflow.messages.length} messages
      </p>
    </button>
  );

  return (
    <div className="h-full overflow-y-auto bg-white">
      {/* Running Workflows */}
      <details open className="border-b border-gray-200">
        <summary className="px-4 py-3 bg-gray-50 font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 transition-colors">
          Running Workflows ({runningWorkflows.length})
        </summary>
        <div>
          {runningWorkflows.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No running workflows</p>
              <p className="text-sm mt-2">Start a workflow from the Chat tab</p>
            </div>
          ) : (
            runningWorkflows.map(renderWorkflowItem)
          )}
        </div>
      </details>

      {/* Completed Workflows */}
      <details className="border-b border-gray-200">
        <summary className="px-4 py-3 bg-gray-50 font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 transition-colors">
          Completed ({completedWorkflows.length})
        </summary>
        <div>
          {completedWorkflows.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No completed workflows</p>
            </div>
          ) : (
            completedWorkflows.map(renderWorkflowItem)
          )}
        </div>
      </details>
    </div>
  );
}
