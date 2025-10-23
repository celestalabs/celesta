import { useState, useCallback } from "react";
import { WorkflowState, WorkflowStatus } from "./types";
import { WSMessage } from "./useWebSocket";

export function useWorkflowsState() {
  const [workflows, setWorkflows] = useState<Map<string, WorkflowState>>(
    new Map()
  );

  const addWorkflow = useCallback((workflowId: string, prompt: string) => {
    setWorkflows((prev) => {
      const newMap = new Map(prev);
      newMap.set(workflowId, {
        id: workflowId,
        prompt,
        status: "running",
        messages: [],
        startedAt: new Date(),
      });
      return newMap;
    });
  }, []);

  const addMessageToWorkflow = useCallback(
    (workflowId: string, message: WSMessage) => {
      setWorkflows((prev) => {
        const workflow = prev.get(workflowId);
        if (!workflow) return prev;

        const newMap = new Map(prev);
        const updatedWorkflow = {
          ...workflow,
          messages: [...workflow.messages, message],
        };

        // Update pending states based on message type
        if (message.type === "question" && "isQuestion" in message) {
          updatedWorkflow.pendingQuestion = {
            messageId: message.id,
            question: message.content,
          };
        } else if (message.type === "answer") {
          updatedWorkflow.pendingQuestion = undefined;
        } else if (message.type === "request_credentials") {
          updatedWorkflow.pendingCredentialRequest = {
            messageId: message.id,
            integrationName:
              "integrationName" in message ? message.integrationName : "",
          };
        } else if (message.type === "provide_credentials") {
          updatedWorkflow.pendingCredentialRequest = undefined;
        }

        newMap.set(workflowId, updatedWorkflow);
        return newMap;
      });
    },
    []
  );

  const updateWorkflowStatus = useCallback(
    (workflowId: string, status: WorkflowStatus) => {
      setWorkflows((prev) => {
        const workflow = prev.get(workflowId);
        if (!workflow) return prev;

        const newMap = new Map(prev);
        newMap.set(workflowId, {
          ...workflow,
          status,
          completedAt: status !== "running" ? new Date() : workflow.completedAt,
        });
        return newMap;
      });
    },
    []
  );

  const getWorkflow = useCallback(
    (workflowId: string): WorkflowState | undefined => {
      return workflows.get(workflowId);
    },
    [workflows]
  );

  const getRunningWorkflows = useCallback((): WorkflowState[] => {
    return Array.from(workflows.values()).filter((w) => w.status === "running");
  }, [workflows]);

  const getCompletedWorkflows = useCallback((): WorkflowState[] => {
    return Array.from(workflows.values()).filter(
      (w) => w.status === "completed" || w.status === "failed"
    );
  }, [workflows]);

  return {
    workflows,
    addWorkflow,
    addMessageToWorkflow,
    updateWorkflowStatus,
    getWorkflow,
    getRunningWorkflows,
    getCompletedWorkflows,
  };
}
import { useState, useCallback } from "react";
import { WorkflowState, WorkflowStatus } from "./types";
import { WSMessage } from "./useWebSocket";

export function useWorkflowsState() {
  const [workflows, setWorkflows] = useState<Map<string, WorkflowState>>(
    new Map()
  );

  const addWorkflow = useCallback((workflowId: string, prompt: string) => {
    setWorkflows((prev) => {
      const newMap = new Map(prev);
      newMap.set(workflowId, {
        id: workflowId,
        prompt,
        status: "running",
        messages: [],
        startedAt: new Date(),
      });
      return newMap;
    });
  }, []);

  const addMessageToWorkflow = useCallback(
    (workflowId: string, message: WSMessage) => {
      setWorkflows((prev) => {
        const workflow = prev.get(workflowId);
        if (!workflow) return prev;

        const newMap = new Map(prev);
        const updatedWorkflow = {
          ...workflow,
          messages: [...workflow.messages, message],
        };

        // Update pending states based on message type
        if (message.type === "question" && "isQuestion" in message) {
          updatedWorkflow.pendingQuestion = {
            messageId: message.id,
            question: message.content,
          };
        } else if (message.type === "answer") {
          updatedWorkflow.pendingQuestion = undefined;
        } else if (message.type === "request_credentials") {
          updatedWorkflow.pendingCredentialRequest = {
            messageId: message.id,
            integrationName:
              "integrationName" in message ? message.integrationName : "",
          };
        } else if (message.type === "provide_credentials") {
          updatedWorkflow.pendingCredentialRequest = undefined;
        }

        newMap.set(workflowId, updatedWorkflow);
        return newMap;
      });
    },
    []
  );

  const updateWorkflowStatus = useCallback(
    (workflowId: string, status: WorkflowStatus) => {
      setWorkflows((prev) => {
        const workflow = prev.get(workflowId);
        if (!workflow) return prev;

        const newMap = new Map(prev);
        newMap.set(workflowId, {
          ...workflow,
          status,
          completedAt: status !== "running" ? new Date() : workflow.completedAt,
        });
        return newMap;
      });
    },
    []
  );

  const getWorkflow = useCallback(
    (workflowId: string): WorkflowState | undefined => {
      return workflows.get(workflowId);
    },
    [workflows]
  );

  const getRunningWorkflows = useCallback((): WorkflowState[] => {
    return Array.from(workflows.values()).filter((w) => w.status === "running");
  }, [workflows]);

  const getCompletedWorkflows = useCallback((): WorkflowState[] => {
    return Array.from(workflows.values()).filter(
      (w) => w.status === "completed" || w.status === "failed"
    );
  }, [workflows]);

  return {
    workflows,
    addWorkflow,
    addMessageToWorkflow,
    updateWorkflowStatus,
    getWorkflow,
    getRunningWorkflows,
    getCompletedWorkflows,
  };
}
