import getXPath from "get-xpath";
import {
  type ResponseWebMessage,
  isAgentActionWebMessage,
  isWebMessageResponseIdTuple,
} from "~/shared/utils/webMessages.js";

export default defineContentScript({
  matches: ["*://*/*"],
  runAt: "document_start",
  main() {
    console.log("Hello from agent content script");

    let agentFrame = null as { show: () => void; hide: () => void } | null;

    document.addEventListener("DOMContentLoaded", () => {
      const clickAnimStyle = document.createElement("style");
      clickAnimStyle.textContent = `
  .__click_visual {
    position: absolute;
    width: 20px;
    height: 20px;
    border: 2px solid red;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: 2147483647;
    animation: __click_fade 0.4s ease-out forwards;
  }

  @keyframes __click_fade {
    from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    to { opacity: 0; transform: translate(-50%, -50%) scale(3); }
  }
`;
      document.head.appendChild(clickAnimStyle);

      // Handle clicks
      document.addEventListener(
        "click",
        (e) => {
          const dot = document.createElement("div");
          dot.className = "__click_visual";
          dot.style.left = e.pageX + "px";
          dot.style.top = e.pageY + "px";
          document.body.appendChild(dot);
          setTimeout(() => dot.remove(), 400);
        },
        true
      );

      const framePulseStyle = document.createElement("style");
      framePulseStyle.textContent = `
  @keyframes __agent_pulse {
    0%   { box-shadow: 0 0 10px 2px rgba(0,255,255,0.6); }
    50%  { box-shadow: 0 0 20px 4px rgba(0,255,255,1); }
    100% { box-shadow: 0 0 10px 2px rgba(0,255,255,0.6); }
  }

  .__agent_frame {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    border: 3px solid rgba(0,255,255,0.8);
    border-radius: 4px;
    box-sizing: border-box;
    pointer-events: none;
    z-index: 2147483647;
    animation: __agent_pulse 1.5s infinite ease-in-out;
  }
`;
      document.head.appendChild(framePulseStyle);

      // Create the frame overlay
      const frame = document.createElement("div");
      frame.className = "__agent_frame";
      document.body.appendChild(frame);

      // Optional helper API (you can trigger manually later)

      agentFrame = {
        show() {
          frame.style.display = "block";
        },
        hide() {
          frame.style.display = "none";
        },
      };
    });

    browser.runtime.onMessage.addListener(async (messageResponseIdTuple) => {
      console.log("Received message", messageResponseIdTuple);

      // Not a message payload
      if (!isWebMessageResponseIdTuple(messageResponseIdTuple)) return;
      console.log("Received valid web message", messageResponseIdTuple);
      const [message, responseWebMessageId] = messageResponseIdTuple;

      // Not the right message
      if (!isAgentActionWebMessage(message)) return;

      console.log(
        "Received valid agent action web message",
        messageResponseIdTuple
      );

      switch (message.action) {
        case "getPageContent": {
          console.log("Processing getPageContent action");
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
        case "scrollDocument": {
          console.log("Processing scrollDocument action");
          window.scrollBy(message.deltaX, message.deltaY);
        }
        case "startAgent": {
          console.log("Processing startAgent action");
          agentFrame?.show();
          break;
        }
      }
    });
  },
});
