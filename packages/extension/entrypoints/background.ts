import { logger } from "@celesta/common";
import { getActiveTabId } from "~/utils/getActiveTabId.js";
import {
  isCheckActiveTabWebMessage,
  isWebMessageResponseIdTuple,
  type ResponseWebMessage,
} from "~/utils/webMessages.js";

const log = logger("background");

// Storage key for pending prompt (sidepanel will read and send via WebSocket)
const PENDING_PROMPT_KEY = "pendingPrompt";

// Context menu action types
type CelestaAction = "explore" | "explain" | "summarize";

// Build prompt for context menu action
function buildAssistPrompt(
  action: CelestaAction,
  selectedText: string
): string {
  const actionPrompts = {
    explore: `Explore this topic in depth:\n\n> ${selectedText}`,
    explain: `Explain the following to me:\n\n> ${selectedText}`,
    summarize: `Summarize the following:\n\n> ${selectedText}`,
  };

  return actionPrompts[action];
}

export default defineBackground(() => {
  // keep alive so it doesnt go inactive
  browser.runtime.onStartup.addListener(() => log("keep-alive"));
  browser.tabs.onUpdated.addListener(() => log("keep-alive"));

  browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

  browser.runtime.onInstalled.addListener(() => {
    browser.tabs.create({});

    // Create context menu with nested items for text selection
    browser.contextMenus.create({
      id: "celesta-assist",
      title: "Celesta Assist",
      contexts: ["selection"],
    });

    browser.contextMenus.create({
      id: "celesta-explore",
      parentId: "celesta-assist",
      title: "Explore",
      contexts: ["selection"],
    });

    browser.contextMenus.create({
      id: "celesta-explain",
      parentId: "celesta-assist",
      title: "Explain",
      contexts: ["selection"],
    });

    browser.contextMenus.create({
      id: "celesta-summarize",
      parentId: "celesta-assist",
      title: "Summarize",
      contexts: ["selection"],
    });

    // Page context menu (right-click anywhere on page)
    browser.contextMenus.create({
      id: "celesta-summarize-page",
      title: "Summarize with Celesta",
      contexts: ["page"],
    });
  });

  // Handle context menu clicks
  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    // Open the sidepanel
    tab && browser.sidePanel.open({ windowId: tab.windowId });

    // Handle "Summarize with Celesta" for page context
    if (
      info.menuItemId === "celesta-summarize-page" &&
      tab?.url &&
      tab?.title
    ) {
      log(`Summarize page: ${tab.title}`);
      const prompt = `Summarize this page for me:\n\n> [${tab.title}](${tab.url})`;
      await browser.storage.session.set({
        [PENDING_PROMPT_KEY]: { prompt, timestamp: Date.now() },
      });
      return;
    }

    // Handle text selection actions
    if (!info.selectionText || !tab?.id) return;

    const actionMap: Record<string, CelestaAction> = {
      "celesta-explore": "explore",
      "celesta-explain": "explain",
      "celesta-summarize": "summarize",
    };

    const action = actionMap[info.menuItemId as string];
    if (!action) return;

    log(
      `Context menu action: ${action} on "${info.selectionText.slice(0, 50)}..."`
    );

    // Build the prompt and store it (sidepanel will read, send via WebSocket, then clear)
    const prompt = buildAssistPrompt(action, info.selectionText);
    await browser.storage.session.set({
      [PENDING_PROMPT_KEY]: { prompt, timestamp: Date.now() },
    });
  });

  browser.runtime.onMessage.addListener(
    async (messageResponseIdTuple, sender) => {
      if (!isWebMessageResponseIdTuple(messageResponseIdTuple)) return;
      const [message, responseMessageId] = messageResponseIdTuple;

      // Handle content scripts checking if they are the active tab.
      if (isCheckActiveTabWebMessage(message) && responseMessageId != null) {
        const activeTab = await getActiveTabId();

        const senderTab = sender.tab?.id ?? -2;

        browser.runtime.sendMessage({
          __isWebMessage: true,
          __webMessageType: "ResponseWebMessage",
          responseWebMessageId: responseMessageId,
          payload: activeTab === senderTab,
        } satisfies ResponseWebMessage);
      }
    }
  );
});
