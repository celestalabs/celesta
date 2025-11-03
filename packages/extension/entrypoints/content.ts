import getXPath from "get-xpath";
import {
  type ResponseWebMessage,
  isAgentActionWebMessage,
  isWebMessageResponseIdTuple,
} from "~/shared/utils/webMessages.js";

function handleStartAgentUI() {
  document.head.appendChild(
    ((el: HTMLElement) => {
      el.textContent = `
html {
 scroll-behavior: smooth;
}

.__click_visual {
  position: absolute;
  width: 20px;
  height: 20px;
  border: 2px solid #17ffe0;
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

@property --agent-frame-gradient {
  syntax: '<percentage>';
  inherits: false;
  initial-value: 90%;
}

@keyframes __agent_gradient_shift  {
  0% {
    --agent-frame-gradient: 95%;
  }
  50% {
    --agent-frame-gradient: 90%;
  }
  100% {
    --agent-frame-gradient: 95%;
  }
}

.__agent_frame {
  opacity: 0;
  pointer-events: none;
}

.__agent_frame::backdrop {
  --grad-percent: 90%;
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
  z-index: 2147483648;
  background: radial-gradient(circle,rgba(0, 0, 0, 0.01) 0%, rgba(0, 0, 0, 0) var(--agent-frame-gradient), #17ffe0 100%);
  animation: __agent_gradient_shift 1s ease infinite;
}`;
      return el;
    })(document.createElement("style"))
  );

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

  // Create the frame overlay
  const frame = document.createElement("div");
  frame.popover = "manual";
  frame.className = "__agent_frame";
  document.body.appendChild(frame);
  frame.showPopover();
}

let agentStarted = false;

export default defineContentScript({
  matches: ["*://*/*"],
  runAt: "document_start",
  main() {
    console.log("Hello from agent content script");

    // document.addEventListener("DOMContentLoaded", handleStartAgentUI);

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
          break;
        }
        case "startAgent": {
          if (agentStarted) {
            break;
          }

          agentStarted = true;

          console.log("Processing startAgent action");

          handleStartAgentUI();
          break;
        }
      }
    });
  },
});
