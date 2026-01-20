import { type BrowserContextAction, logger } from "@celesta/common";
import { type AgentActionWebMessage, sendWebMessage } from "./webMessages";

const log = logger("browserContextActions");

const browserContextActions = {
  OPEN_URL: async ({ url }) => {
    try {
      await browser.tabs.create({ url });
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
  LIST_OPEN_TABS: async () => {
    try {
      const tabs = await browser.tabs.query({});
      return {
        tabs: tabs.map((tab) => ({
          title: tab.title,
          url: tab.url,
          active: tab.active,
        })),
      };
    } catch (error) {
      return { tabs: [], error: (error as Error).message };
    }
  },
  GET_PAGE_CONTENT: async ({ titleOfOpenTab }) => {
    try {
      const tabs = await browser.tabs.query({ title: titleOfOpenTab });
      const tab = tabs.at(0);

      if (tab == null || tab.id == null) {
        throw new Error(`No tab found with title: ${titleOfOpenTab}`);
      }

      // Check if it's a restricted URL that content scripts can't run on
      const url = tab.url || "";
      if (
        url.startsWith("chrome://") ||
        url.startsWith("chrome-extension://") ||
        url.startsWith("about:") ||
        url.startsWith("edge://") ||
        url.startsWith("moz-extension://")
      ) {
        return {
          success: false,
          error: `Cannot access content on this page (${url.split("/")[0]}//). Browser restricts extensions from reading internal pages.`,
        };
      }

      log("Sending getPageContent to tabId:", tab.id);

      const response = await sendWebMessage(
        ["tabs", tab.id],
        {
          __isWebMessage: true,
          __webMessageType: "AgentActionWebMessage",
          action: "getPageContent",
        } satisfies AgentActionWebMessage,
        true
      );

      log("Response payload:", response.payload);

      return response.payload;
    } catch (error) {
      log("get page content error", error);
      const errorMsg = `${error}`;
      
      // Provide more helpful error message for connection issues
      if (errorMsg.includes("Could not establish connection") || errorMsg.includes("Receiving end does not exist")) {
        return {
          success: false,
          error: "Cannot read this page's content. The page may need to be refreshed, or it may be a restricted page (like browser settings or extension pages) that extensions cannot access.",
        };
      }
      
      return { success: false, error: errorMsg };
    }
  },
} as const satisfies {
  [K in BrowserContextAction["type"]]: (
    props: Omit<Extract<BrowserContextAction, { type: K }>, "type">
  ) => Promise<object>;
};

export function executeBrowserContextAction<
  K extends BrowserContextAction["type"],
>(action: Extract<BrowserContextAction, { type: K }>): Promise<object> {
  return browserContextActions[action.type](action);
}
