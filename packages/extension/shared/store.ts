import {
  ContextId,
  WorkflowId,
  WorkflowMetadata,
  WSMessage,
} from "@celesta/types";
import { create } from "zustand";

type WSMessageWithContextId = Extract<WSMessage, { contextId: ContextId }>;

type Store = {
  messagesByContext: Partial<Record<ContextId, WSMessageWithContextId[]>>;
  addContext: (contextId: ContextId) => void;
  addMessageToContext: (message: WSMessageWithContextId) => void;
  workflowMetadata: Partial<Record<WorkflowId, WorkflowMetadata>>;
  upsertWorkflow: (partialWorkflowMetadata: WorkflowMetadata) => void;
};

export const useStore = create<Store>()((set) => ({
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
  upsertWorkflow: (workflowMetadata: WorkflowMetadata) =>
    set((state) => ({
      ...state,
      workflowMetadata: {
        ...state.workflowMetadata,
        [workflowMetadata.workflowId]: workflowMetadata,
      },
    })),
}));
