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
      const tabId = (await browser.tabs.query({ title: titleOfOpenTab })).at(
        0
      )?.id;

      if (tabId == null) {
        throw new Error(`No tab found with title: ${titleOfOpenTab}`);
      }

      log("Sending getPageContent to tabId:", tabId);

      const response = await sendWebMessage(
        ["tabs", tabId],
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
      return { success: false, error: `${error}` };
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
