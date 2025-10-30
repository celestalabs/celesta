import { BrowserContextAction } from "@celesta/common";

export const browserActions: {
  [K in BrowserContextAction["type"]]: (
    props: Extract<BrowserContextAction, { type: K }>
  ) => Promise<object>;
} = {
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
    return {
      response: `didn't find ${titleOfOpenTab} cuz get page content not implemented yet sorry`,
    };
  },
};
