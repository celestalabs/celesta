import { ContextId, WSMessage } from "@celesta/types";
import { create } from "zustand";

type WSMessageWithContextId = Extract<WSMessage, { contextId: ContextId }>;

type Store = {
  messagesByContext: Partial<Record<ContextId, WSMessageWithContextId[]>>;
  addContext: (contextId: ContextId) => void;
  addMessageToContext: (message: WSMessageWithContextId) => void;
};

export const useStore = create<Store>()((set) => ({
  messagesByContext: {},
  addContext: (contextId: ContextId) =>
    set((state) => ({
      ...state,
      messagesByContext: {
        ...state.messagesByContext,
        [contextId]: [],
      },
    })),
  addMessageToContext: (
    message: Extract<WSMessage, { contextId: ContextId }>
  ) =>
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
}));
