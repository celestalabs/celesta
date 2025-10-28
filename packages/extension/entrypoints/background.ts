import { getActiveTabId } from "~/shared/utils/getActiveTabId.js";
import {
  isCheckActiveTabMessage,
  isMessageResponseIdTuple,
  ResponseMessage,
} from "~/shared/utils/messages.js";

export default defineBackground(() => {
  // keep alive so it doesnt go inactive
  browser.runtime.onStartup.addListener(() => console.log("keep-alive"));
  browser.tabs.onUpdated.addListener(() => console.log("keep-alive"));

  browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

  browser.runtime.onMessage.addListener(
    async (messageResponseIdTuple, sender) => {
      if (!isMessageResponseIdTuple(messageResponseIdTuple)) return;
      const [message, responseMessageId] = messageResponseIdTuple;

      // Handle content scripts checking if they are the active tab.
      if (isCheckActiveTabMessage(message) && responseMessageId != null) {
        const activeTab = await getActiveTabId();

        const senderTab = sender.tab?.id ?? -2;

        browser.runtime.sendMessage({
          __isMessage: true,
          __messageType: "ResponseMessage",
          responseMessageId: responseMessageId,
          payload: activeTab === senderTab,
        } satisfies ResponseMessage);
      }
    }
  );
});
