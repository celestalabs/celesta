import { logger } from "@celesta/common";
import { getActiveTabId } from "~/utils/getActiveTabId.js";
import {
  isCheckActiveTabWebMessage,
  isWebMessageResponseIdTuple,
  type ResponseWebMessage,
} from "~/utils/webMessages.js";

const log = logger("background");

export default defineBackground(() => {
  // keep alive so it doesnt go inactive
  browser.runtime.onStartup.addListener(() => log("keep-alive"));
  browser.tabs.onUpdated.addListener(() => log("keep-alive"));

  browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

  browser.runtime.onInstalled.addListener(() => {
    browser.tabs.create({});
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
