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

@keyframes __agent_pulse {
0% { opacity: 0.6; filter: blur(8px); transform: scale(1); }
50% { opacity: 1; filter: blur(12px); transform: scale(1.02); }
100% { opacity: 0.6; filter: blur(8px); transform: scale(1); }
}

@keyframes __agent_gradient_shift {
0% { background-position: 0% 50%; }
50% { background-position: 100% 50%; }
100% { background-position: 0% 50%; }
}

.__agent_frame {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
  z-index: 2147483647;
  border-radius: 100px;
  background: linear-gradient(130deg,
    rgba(0,255,255,0.5),
    rgba(120,0,255,0.5),
    rgba(0,255,180,0.5)
  );
  background-size: 300% 300%;
  animation: __agent_pulse 2s ease-in-out infinite,
              __agent_gradient_shift 6s linear infinite;
  mask: 
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
          mask-composite: exclude;
  padding: 50px; /* border thickness */
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
          frame.className = "__agent_frame";
          document.body.appendChild(frame);
          break;
        }
      }
    });
  },
});
