import { registerGlobalForDevMode } from "./devModeGlobals";

/** -1 means unexpected error. */
export async function getActiveTabId() {
  return (
    (await browser.tabs.query({ active: true, currentWindow: true })).at(0)
      ?.id ?? -1
  );
}

registerGlobalForDevMode("getActiveTabId", getActiveTabId);
