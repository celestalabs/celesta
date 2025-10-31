import { z } from "zod";

export type BrowserContextAction =
  | { type: "OPEN_URL"; url: string }
  | {
      type: "GET_PAGE_CONTENT";
      titleOfOpenTab: string;
    }
  | { type: "LIST_OPEN_TABS" };

export const goToUrlSchema = z
  .object({
    type: z.literal("GOTO_URL"),
    url: z.string().describe("URL to navigate to"),
  })
  .describe("Navigate the tab to a new URL.");

export const reloadTabSchema = z
  .object({
    type: z.literal("RELOAD_TAB"),
    tabId: z.number().describe("ID of the tab to reload"),
  })
  .describe("Reloads the tab, optionally ignoring the cache.");

export const goBackSchema = z
  .object({
    type: z.literal("GO_BACK"),
    tabId: z.number().describe("ID of the tab to go back in history"),
  })
  .describe("Navigates back in the tab's history.");

export const goForwardSchema = z
  .object({
    type: z.literal("GO_FORWARD"),
    tabId: z.number().describe("ID of the tab to go forward in history"),
  })
  .describe("Navigates forward in the tab's history.");

export const waitForLoadStateSchema = z
  .object({
    type: z.literal("WAIT_FOR_LOAD_STATE"),
    tabId: z.number().describe("ID of the tab to wait for"),
    state: z
      .enum(["load", "domcontentloaded"])
      .describe("Load state to wait for"),
  })
  .describe(
    "Waits for the page to reach a specific load state (e.g., 'load' or 'domcontentloaded')."
  );

export const clickSchema = z
  .object({
    type: z.literal("CLICK"),
    tabId: z.number().describe("ID of the tab to click in"),
    x: z.number().describe("X coordinate for click"),
    y: z.number().describe("Y coordinate for click"),
    options: z
      .object({
        button: z
          .enum(["left", "right", "middle"])
          .optional()
          .describe("Mouse button to use"),
        clickCount: z.number().optional().describe("Number of clicks"),
      })
      .optional()
      .describe("Click options"),
  })
  .describe(
    "Dispatches a click (mouse press and release) at the given coordinates."
  );

export const doubleClickSchema = z
  .object({
    type: z.literal("DOUBLE_CLICK"),
    tabId: z.number().describe("ID of the tab to double click in"),
    x: z.number().describe("X coordinate for double click"),
    y: z.number().describe("Y coordinate for double click"),
  })
  .describe("Dispatches a double click at the given coordinates.");

export const scrollSchema = z
  .object({
    type: z.literal("SCROLL"),
    tabId: z.number().describe("ID of the tab to scroll in"),
    x: z.number().describe("X coordinate to scroll to"),
    y: z.number().describe("Y coordinate to scroll to"),
    deltaX: z.number().describe("Amount to scroll horizontally"),
    deltaY: z.number().describe("Amount to scroll vertically"),
  })
  .describe(
    "Dispatches a mouse wheel (scroll) event at the given coordinates."
  );

export const dragAndDropSchema = z
  .object({
    type: z.literal("DRAG_AND_DROP"),
    tabId: z.number().describe("ID of the tab to drag in"),
    fromX: z.number().describe("Start X coordinate"),
    fromY: z.number().describe("Start Y coordinate"),
    toX: z.number().describe("End X coordinate"),
    toY: z.number().describe("End Y coordinate"),
    options: z
      .object({
        button: z
          .enum(["left", "right", "middle"])
          .optional()
          .describe("Mouse button to use"),
        steps: z.number().optional().describe("Number of intermediate steps"),
        delay: z.number().optional().describe("Delay between steps in ms"),
      })
      .optional()
      .describe("Drag options"),
  })
  .describe(
    "Simulates a drag-and-drop operation from one coordinate to another."
  );

export const typeTextSchema = z
  .object({
    type: z.literal("TYPE_TEXT"),
    tabId: z.number().describe("ID of the tab to type in"),
    text: z.string().describe("Text to type"),
    options: z
      .object({
        delay: z.number().optional().describe("Delay between keystrokes in ms"),
      })
      .optional()
      .describe("Type options"),
  })
  .describe(
    "Types a string of text. Assumes the target element is already focused."
  );

export const keyPressSchema = z
  .object({
    type: z.literal("KEY_PRESS"),
    tabId: z.number().describe("ID of the tab to send key press to"),
    key: z.string().describe("Key to press"),
    options: z
      .object({
        delay: z
          .number()
          .optional()
          .describe("Delay between key press and release in ms"),
      })
      .optional()
      .describe("Key press options"),
  })
  .describe(
    "Presses a single key or key combination (e.g., 'A', 'Enter', 'Cmd+C', 'Shift+Tab'). Stateless and sends a single keyDown/keyUp pair with modifiers."
  );

export const captureScreenshotSchema = z
  .object({
    type: z.literal("CAPTURE_SCREENSHOT"),
    tabId: z.number().describe("ID of the tab to capture screenshot from"),
    options: z
      .object({
        fullPage: z
          .boolean()
          .optional()
          .describe("Capture full page screenshot"),
      })
      .optional()
      .describe("Screenshot options"),
  })
  .describe(
    "Captures a screenshot of the page. Returns a base64-encoded string of the PNG image."
  );

export const browserAgentActionSchemaByName = {
  CAPTURE_SCREENSHOT: captureScreenshotSchema,
  CLICK: clickSchema,
  DOUBLE_CLICK: doubleClickSchema,
  DRAG_AND_DROP: dragAndDropSchema,
  GOTO_URL: goToUrlSchema,
  GO_BACK: goBackSchema,
  GO_FORWARD: goForwardSchema,
  KEY_PRESS: keyPressSchema,
  RELOAD_TAB: reloadTabSchema,
  TYPE_TEXT: typeTextSchema,
  WAIT_FOR_LOAD_STATE: waitForLoadStateSchema,
  SCROLL: scrollSchema,
} as const;

export const browserAgentActionSchema = z.discriminatedUnion("type", [
  captureScreenshotSchema,
  clickSchema,
  doubleClickSchema,
  dragAndDropSchema,
  goToUrlSchema,
  goBackSchema,
  goForwardSchema,
  keyPressSchema,
  reloadTabSchema,
  typeTextSchema,
  waitForLoadStateSchema,
  scrollSchema,
]);

export type BrowserAgentAction = z.infer<typeof browserAgentActionSchema>;
