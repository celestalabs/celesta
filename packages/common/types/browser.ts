export type BrowserContextAction =
  | { type: "OPEN_URL"; url: string }
  | {
      type: "GET_PAGE_CONTENT";
      titleOfOpenTab: string;
    }
  | { type: "LIST_OPEN_TABS" };
