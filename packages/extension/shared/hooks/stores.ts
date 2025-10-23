import { create } from "zustand";
import { PendingIntent, WorkflowState, AppView } from "./types";
import { WSMessage } from "./websocketManager";

interface ChatState {
  messages: WSMessage[];
  pendingIntent: PendingIntent | null;
  pendingCredentialRequest: {
    messageId: string;
    integrationName: string;
  } | null;
  addUserMessage: (msg: WSMessage) => void;
  addAssistantMessage: (msg: WSMessage) => void;
  addMessage: (msg: WSMessage) => void;
  setIntent: (intent: PendingIntent | null) => void;
  clearIntent: () => void;
}

interface WorkflowsState {
  workflows: Map<string, WorkflowState>;
  addWorkflow: (workflowId: string, prompt: string) => void;
  addMessageToWorkflow: (workflowId: string, message: WSMessage) => void;
  updateWorkflowStatus: (
    workflowId: string,
    status: WorkflowState["status"]
  ) => void;
  getWorkflow: (workflowId: string) => WorkflowState | undefined;
  getRunningWorkflows: () => WorkflowState[];
  getCompletedWorkflows: () => WorkflowState[];
}

interface AppState {
  currentView: AppView;
  selectedWorkflowId?: string;
  connected: boolean;
  setView: (view: AppView, workflowId?: string) => void;
  setConnected: (connected: boolean) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  pendingIntent: null,
  pendingCredentialRequest: null,
  addUserMessage: (msg: WSMessage) =>
    set((state) => ({ messages: [...state.messages, msg] })),
  addAssistantMessage: (msg: WSMessage) =>
    set((state) => ({ messages: [...state.messages, msg] })),
  addMessage: (msg: WSMessage) =>
    set((state) => {
      const updates: Partial<ChatState> = {
        messages: [...state.messages, msg],
      };
      if (msg.type === "request_credentials" && "integrationName" in msg) {
        updates.pendingCredentialRequest = {
          messageId: msg.id,
          integrationName: (msg as WSMessage & { integrationName: string })
            .integrationName,
        };
      } else if (msg.type === "provide_credentials") {
        updates.pendingCredentialRequest = null;
      }
      return updates;
    }),
  setIntent: (intent: PendingIntent | null) => set({ pendingIntent: intent }),
  clearIntent: () => set({ pendingIntent: null }),
}));

export const useWorkflowsStore = create<WorkflowsState>((set, get) => ({
  workflows: new Map(),
  addWorkflow: (workflowId: string, prompt: string) =>
    set((state) => {
      const newMap = new Map(state.workflows);
      newMap.set(workflowId, {
        id: workflowId,
        prompt,
        status: "running",
        messages: [],
        startedAt: new Date(),
      });
      return { workflows: newMap };
    }),
  addMessageToWorkflow: (workflowId: string, message: WSMessage) =>
    set((state) => {
      const workflow = state.workflows.get(workflowId);
      if (!workflow) return {};
      const newMap = new Map(state.workflows);
      const updatedWorkflow = {
        ...workflow,
        messages: [...workflow.messages, message],
      };
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
          integrationName: (message as WSMessage & { integrationName: string })
            .integrationName,
        };
      } else if (message.type === "provide_credentials") {
        updatedWorkflow.pendingCredentialRequest = undefined;
      }
      newMap.set(workflowId, updatedWorkflow);
      return { workflows: newMap };
    }),
  updateWorkflowStatus: (workflowId: string, status: WorkflowState["status"]) =>
    set((state) => {
      const workflow = state.workflows.get(workflowId);
      if (!workflow) return {};
      const newMap = new Map(state.workflows);
      newMap.set(workflowId, {
        ...workflow,
        status,
        completedAt: status !== "running" ? new Date() : workflow.completedAt,
      });
      return { workflows: newMap };
    }),
  getWorkflow: (workflowId: string) => get().workflows.get(workflowId),
  getRunningWorkflows: () =>
    Array.from(get().workflows.values()).filter(
      (w: WorkflowState) => w.status === "running"
    ),
  getCompletedWorkflows: () =>
    Array.from(get().workflows.values()).filter(
      (w: WorkflowState) => w.status === "completed" || w.status === "failed"
    ),
}));

export const useAppStore = create<AppState>((set) => ({
  currentView: "chat",
  selectedWorkflowId: undefined,
  connected: false,
  setView: (view: AppView, workflowId?: string) =>
    set({ currentView: view, selectedWorkflowId: workflowId }),
  setConnected: (connected: boolean) => set({ connected }),
}));
