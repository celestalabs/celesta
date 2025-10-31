import getXPath from "get-xpath";

import {
  ResponseWebMessage,
  isAgentActionWebMessage,
  isWebMessageResponseIdTuple,
} from "~/shared/utils/webMessages.js";

export default defineContentScript({
  matches: ["*://*/*"],
  runAt: "document_start",
  main() {
    console.log("Hello from agent content script");

    browser.runtime.onMessage.addListener(async (messageResponseIdTuple) => {
      console.log("Received message", messageResponseIdTuple);

      // Not a message payload
      if (!isWebMessageResponseIdTuple(messageResponseIdTuple)) return;
      const [message, responseWebMessageId] = messageResponseIdTuple;

      // Not the right message
      if (!isAgentActionWebMessage(message)) return;

      switch (message.action) {
        case "getPageContent": {
          const rawHtml = document.documentElement.outerHTML.trim();
          const filteredHtml = rawHtml
            .replace(/<!--[\s\S]*?-->/g, "") // remove comments
            .replace(
              /<(meta|link|style|script|noscript)[^>]*>[\s\S]*?<\/\1>/gi,
              ""
            ); // remove tags

          const inputElements = document.querySelectorAll<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
          >("input,textarea,select");

          const inputValueMap: Record<string, string> = {};

          inputElements.forEach((element) => {
            inputValueMap[getXPath(element)] = element.value;
          });

          return browser.runtime.sendMessage({
            __isWebMessage: true,
            __webMessageType: "ResponseWebMessage",
            responseWebMessageId,
            payload:
              filteredHtml !== ""
                ? {
                    ...(inputElements.length > 0 ? { inputValueMap } : null),
                    pageHtmlContent: filteredHtml,
                  }
                : "The page is either blank or not loaded.",
          } satisfies ResponseWebMessage);
        }
      }
    });
  },
});
