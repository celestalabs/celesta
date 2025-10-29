import {
  ContextId,
  WorkflowId,
  WorkflowMetadata,
  WorkflowStatus,
  WSMessage,
} from "@celesta/types";
import { create } from "zustand";
import { ViewId } from "./types";

type WSMessageWithContextId = Extract<WSMessage, { contextId: ContextId }>;

type Store = {
  currentView: ViewId;
  routeToView: (viewId: ViewId) => void;

  messagesByContext: Partial<Record<ContextId, WSMessageWithContextId[]>>;
  addContext: (contextId: ContextId) => void;
  addMessageToContext: (message: WSMessageWithContextId) => void;

  workflowMetadata: Partial<Record<WorkflowId, WorkflowMetadata>>;
  createWorkflow: (workflowMetadata: WorkflowMetadata) => void;
  updateWorkflowStatus: (
    workflowId: WorkflowId,
    status: WorkflowStatus
  ) => void;
};

export const useStore = create<Store>()((set) => ({
  currentView: "CHAT",
  routeToView: (viewId: ViewId) =>
    set((state) => ({
      ...state,
      currentView: viewId,
    })),
  messagesByContext: {},
  workflowMetadata: {},
  addContext: (contextId: ContextId) =>
    set((state) => ({
      ...state,
      messagesByContext: {
        ...state.messagesByContext,
        [contextId]: [],
      },
    })),
  addMessageToContext: (message: WSMessageWithContextId) =>
    set((state) => {
      const existingMessages = state.messagesByContext[message.contextId] ?? [];
      return {
        ...state,
        messagesByContext: {
          ...state.messagesByContext,
          [message.contextId]: [...existingMessages, message],
        },
      };
    }),
  createWorkflow: (workflowMetadata: WorkflowMetadata) =>
    set((state) => ({
      ...state,
      workflowMetadata: {
        ...state.workflowMetadata,
        [workflowMetadata.workflowId]: workflowMetadata,
      },
    })),
  updateWorkflowStatus: (workflowId: WorkflowId, status: WorkflowStatus) =>
    set((state) => ({
      ...state,
      workflowMetadata: {
        ...state.workflowMetadata,
        [workflowId]: {
          ...state.workflowMetadata[workflowId],
          status,
        },
      },
    })),
}));
