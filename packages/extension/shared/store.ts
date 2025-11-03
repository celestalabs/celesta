import type {
  BrowserAgentId,
  ContextId,
  ToolCallId,
  UIWorkflowTask,
  WorkflowId,
  WorkflowMetadata,
  WorkflowStatus,
  WSMessage,
} from "@celesta/common";
import { create } from "zustand";
import type { ViewId } from "./types";

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

  tasksByWorkflow: Partial<Record<WorkflowId, UIWorkflowTask[]>>;
  createWorkflowTask: (workflowId: WorkflowId, task: UIWorkflowTask) => void;
  updateWorkflowTaskStatus: (
    workflowId: WorkflowId,
    taskSlug: string,
    taskStatus: WorkflowStatus
  ) => void;

  tabIdByBrowserAgent: Partial<Record<BrowserAgentId, number>>;
  addBrowserAgentTabId: (browserAgentId: BrowserAgentId, tabId: number) => void;
  browserAgentByToolId: Partial<Record<ToolCallId, BrowserAgentId>>;
  addBrowserAgentToolId: (
    toolCallId: ToolCallId,
    browserAgentId: BrowserAgentId
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

  workflowMetadata: {},
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

  tasksByWorkflow: {},
  createWorkflowTask: (workflowId: WorkflowId, task: UIWorkflowTask) =>
    set((state) => {
      const existingTasks = state.tasksByWorkflow[workflowId] ?? [];
      return {
        ...state,
        tasksByWorkflow: {
          ...state.tasksByWorkflow,
          [workflowId]: [...existingTasks, task],
        },
      };
    }),
  updateWorkflowTaskStatus: (
    workflowId: WorkflowId,
    taskSlug: string,
    taskStatus: WorkflowStatus
  ) =>
    set((state) => {
      const existingTasks = state.tasksByWorkflow[workflowId] ?? [];
      const updatedTasks = existingTasks.map((t) =>
        t.slug === taskSlug ? { ...t, status: taskStatus } : t
      );
      return {
        ...state,
        tasksByWorkflow: {
          ...state.tasksByWorkflow,
          [workflowId]: updatedTasks,
        },
      };
    }),

  tabIdByBrowserAgent: {},
  addBrowserAgentTabId: (browserAgentId: BrowserAgentId, tabId: number) =>
    set((state) => ({
      ...state,
      tabIdByBrowserAgent: {
        ...state.tabIdByBrowserAgent,
        [browserAgentId]: tabId,
      },
    })),

  browserAgentByToolId: {},
  addBrowserAgentToolId: (toolCallId, browserAgentId) =>
    set((state) => ({
      ...state,
      browserAgentByToolId: {
        ...state.browserAgentByToolId,
        [toolCallId]: browserAgentId,
      },
    })),
}));
