import { logger } from "@celesta/common";
import { Protocol } from "devtools-protocol";

const log = logger("browserAgentActions");

/**
 * Attaches the debugger to a specific tab.
 * You MUST call this before any other CDP command.
 * @param tabId The ID of the tab to attach to.
 */
export async function attachDebugger(tabId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    // We must use "1.3" as the protocol version
    browser.debugger.attach({ tabId }, "1.3", () => {
      if (browser.runtime.lastError) {
        reject(browser.runtime.lastError.message);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Detaches the debugger from a specific tab.
 * @param tabId The ID of the tab to detach from.
 */
export async function detachDebugger(tabId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    browser.debugger.detach({ tabId }, () => {
      if (browser.runtime.lastError) {
        reject(browser.runtime.lastError.message);
      } else {
        resolve();
      }
    });
  });
}

/**
 * A promisified wrapper for browser.debugger.sendCommand.
 * This is the core function all other utilities will use.
 */
async function sendCommand<T extends object>(
  tabId: number,
  method: string,
  params?: Partial<Record<string, any>>
): Promise<T> {
  return new Promise((resolve, reject) => {
    browser.debugger.sendCommand({ tabId }, method, params, (result) => {
      if (browser.runtime.lastError) {
        reject(browser.runtime.lastError.message);
      } else if ((result as any)?.error) {
        reject(new Error((result as any).error.message));
      } else {
        resolve(result as T);
      }
    });
  });
}

/**
 * Gets the main frame ID for a given tab.
 * This is necessary for commands that are frame-specific, like `evaluate`.
 */
export async function getMainFrameId(tabId: number): Promise<string> {
  const { frameTree } = await sendCommand<Protocol.Page.GetFrameTreeResponse>(
    tabId,
    "Page.getFrameTree"
  );
  return frameTree.frame.id;
}

/**
 * Navigates the tab to a new URL.
 */
export async function GOTO(tabId: number, url: string): Promise<void> {
  await sendCommand(tabId, "Page.navigate", { url });
}

/**
 * Reloads the tab, optionally ignoring the cache.
 */
export async function RELOAD_TAB(
  tabId: number,
  ignoreCache = false
): Promise<void> {
  await sendCommand(tabId, "Page.reload", { ignoreCache });
}

/**
 * Navigates back in the tab's history.
 */
export async function GO_BACK(tabId: number): Promise<void> {
  const { entries, currentIndex } =
    await sendCommand<Protocol.Page.GetNavigationHistoryResponse>(
      tabId,
      "Page.getNavigationHistory"
    );
  const prev = entries[currentIndex - 1];
  if (prev) {
    await sendCommand(tabId, "Page.navigateToHistoryEntry", {
      entryId: prev.id,
    });
  }
}

/**
 * Navigates forward in the tab's history.
 */
export async function GO_FORWARD(tabId: number): Promise<void> {
  const { entries, currentIndex } =
    await sendCommand<Protocol.Page.GetNavigationHistoryResponse>(
      tabId,
      "Page.getNavigationHistory"
    );
  const next = entries[currentIndex + 1];
  if (next) {
    await sendCommand(tabId, "Page.navigateToHistoryEntry", {
      entryId: next.id,
    });
  }
}

/**
 * Waits for the page to reach a specific load state (e.g., "load" or "domcontentloaded").
 * This is a simplified version of the LifecycleWatcher.
 */
export async function WAIT_FOR_LOAD_STATE(
  tabId: number,
  mainFrameId: string,
  state: "load" | "domcontentloaded" = "load",
  timeoutMs = 15000
): Promise<void> {
  const record: Record<typeof state, string> = {
    load: "load",
    domcontentloaded: "DOMContentLoaded",
  };
  const wantedEvent = record[state];

  // 1. Enable lifecycle events
  await sendCommand(tabId, "Page.setLifecycleEventsEnabled", { enabled: true });

  // 2. Check current state (fast path)
  try {
    const { executionContextId } =
      await sendCommand<Protocol.Page.CreateIsolatedWorldResponse>(
        tabId,
        "Page.createIsolatedWorld",
        { frameId: mainFrameId, worldName: "load-state-check" }
      );
    const { result } = await sendCommand<Protocol.Runtime.EvaluateResponse>(
      tabId,
      "Runtime.evaluate",
      {
        expression: "document.readyState",
        contextId: executionContextId,
        returnByValue: true,
      }
    );
    const readyState = String(result?.value ?? "");
    if (
      (state === "domcontentloaded" &&
        (readyState === "interactive" || readyState === "complete")) ||
      (state === "load" && readyState === "complete")
    ) {
      return;
    }
  } catch (e) {
    log("waitForLoadState fast path check failed:", e);
    // Ignore fast-path failure, wait for event
  }

  // 3. Wait for the event
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      browser.debugger.onEvent.removeListener(listener);
      reject(
        new Error(`waitForLoadState(${state}) timed out after ${timeoutMs}ms`)
      );
    }, timeoutMs);

    const listener = (
      source: Browser.debugger.Debuggee,
      method: string,
      params?: object
    ) => {
      if (source.tabId !== tabId) return;

      const event = params as Protocol.Page.LifecycleEventEvent;
      if (method === "Page.lifecycleEvent" && event.name === wantedEvent) {
        // Check if it's the main frame
        if (event.frameId === mainFrameId) {
          clearTimeout(timer);
          browser.debugger.onEvent.removeListener(listener);
          resolve();
        }
      }
    };

    browser.debugger.onEvent.addListener(listener);
  });
}

/**
 * Dispatches a click (mouse press and release).
 */
export async function CLICK(
  tabId: number,
  x: number,
  y: number,
  options?: {
    button?: "left" | "right" | "middle";
    clickCount?: number;
  }
): Promise<void> {
  const button = options?.button ?? "left";
  const clickCount = options?.clickCount ?? 1;

  // Move mouse to position
  await sendCommand(tabId, "Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x,
    y,
    button: "none",
  } as Protocol.Input.DispatchMouseEventRequest);

  // Press
  await sendCommand(tabId, "Input.dispatchMouseEvent", {
    type: "mousePressed",
    x,
    y,
    button,
    clickCount,
  } as Protocol.Input.DispatchMouseEventRequest);

  // Release
  await sendCommand(tabId, "Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x,
    y,
    button,
    clickCount,
  } as Protocol.Input.DispatchMouseEventRequest);
}

/**
 * Dispatches a double click.
 */
export async function DOUBLE_CLICK(
  tabId: number,
  x: number,
  y: number
): Promise<void> {
  await CLICK(tabId, x, y, { clickCount: 2, button: "left" });
}

/**
 * Dispatches a mouse wheel (scroll) event.
 */
export async function SCROLL(
  tabId: number,
  x: number,
  y: number,
  deltaX: number,
  deltaY: number
): Promise<void> {
  // Move mouse to position
  await sendCommand(tabId, "Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x,
    y,
    button: "none",
  } as Protocol.Input.DispatchMouseEventRequest);

  // Dispatch wheel event
  await sendCommand(tabId, "Input.dispatchMouseEvent", {
    type: "mouseWheel",
    x,
    y,
    button: "none",
    deltaX,
    deltaY,
  } as Protocol.Input.DispatchMouseEventRequest);
}

/**
 * Simulates a drag-and-drop operation.
 */
export async function DRAG_AND_DROP(
  tabId: number,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  options?: {
    button?: "left" | "right" | "middle";
    steps?: number; // Number of intermediate steps
    delay?: number; // Delay between steps in ms
  }
): Promise<void> {
  const button = options?.button ?? "left";
  const steps = Math.max(1, Math.floor(options?.steps ?? 1));
  const delay = Math.max(0, options?.delay ?? 0);

  const sleep = (ms: number) =>
    new Promise<void>((r) => (ms > 0 ? setTimeout(r, ms) : r()));

  const buttonMask = (b: typeof button): number => {
    switch (b) {
      case "left":
        return 1;
      case "right":
        return 2;
      case "middle":
        return 4;
      default:
        return 1;
    }
  };

  // 1. Move to start
  await sendCommand(tabId, "Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: fromX,
    y: fromY,
    button: "none",
  } as Protocol.Input.DispatchMouseEventRequest);

  // 2. Press
  await sendCommand(tabId, "Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: fromX,
    y: fromY,
    button,
    buttons: buttonMask(button),
    clickCount: 1,
  } as Protocol.Input.DispatchMouseEventRequest);
  if (delay) await sleep(delay);

  // 3. Intermediate moves
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = fromX + (toX - fromX) * t;
    const y = fromY + (toY - fromY) * t;
    await sendCommand(tabId, "Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x,
      y,
      button,
      buttons: buttonMask(button),
    } as Protocol.Input.DispatchMouseEventRequest);
    if (delay) await sleep(delay);
  }

  // 4. Release at end
  await sendCommand(tabId, "Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: toX,
    y: toY,
    button,
    buttons: buttonMask(button),
    clickCount: 1,
  } as Protocol.Input.DispatchMouseEventRequest);
}

const sleep = (ms: number) =>
  new Promise<void>((r) => (ms > 0 ? setTimeout(r, ms) : r()));

/**
 * Types a string of text.
 * Assumes the target element is already focused.
 */
export async function TYPE_TEXT(
  tabId: number,
  text: string,
  options?: { delay?: number }
): Promise<void> {
  const delay = Math.max(0, options?.delay ?? 0);

  // Helper to send one keystroke (down and up)
  const keyStroke = async (
    ch: string,
    override?: {
      key?: string;
      code?: string;
      windowsVirtualKeyCode?: number;
    }
  ) => {
    if (override) {
      const base: Protocol.Input.DispatchKeyEventRequest = {
        type: "keyDown",
        key: override.key,
        code: override.code,
        windowsVirtualKeyCode: override.windowsVirtualKeyCode,
      } as Protocol.Input.DispatchKeyEventRequest;
      await sendCommand(tabId, "Input.dispatchKeyEvent", base);
      await sendCommand(tabId, "Input.dispatchKeyEvent", {
        ...base,
        type: "keyUp",
      } as Protocol.Input.DispatchKeyEventRequest);
      return;
    }

    // Printable character
    const down: Protocol.Input.DispatchKeyEventRequest = {
      type: "keyDown",
      text: ch,
      unmodifiedText: ch,
    };
    await sendCommand(tabId, "Input.dispatchKeyEvent", down);
    await sendCommand(tabId, "Input.dispatchKeyEvent", {
      type: "keyUp",
    } as Protocol.Input.DispatchKeyEventRequest);
  };

  for (const ch of text) {
    if (ch === "\n" || ch === "\r") {
      await keyStroke(ch, {
        key: "Enter",
        code: "Enter",
        windowsVirtualKeyCode: 13,
      });
    } else if (ch === "\t") {
      await keyStroke(ch, {
        key: "Tab",
        code: "Tab",
        windowsVirtualKeyCode: 9,
      });
    } else {
      await keyStroke(ch);
    }
    if (delay) await sleep(delay);
  }
}

// --- Helpers for keyPress ---
const keyDefinitions: Record<
  string,
  { key: string; code: string; vk: number }
> = {
  Enter: { key: "Enter", code: "Enter", vk: 13 },
  Tab: { key: "Tab", code: "Tab", vk: 9 },
  Backspace: { key: "Backspace", code: "Backspace", vk: 8 },
  Escape: { key: "Escape", code: "Escape", vk: 27 },
  Delete: { key: "Delete", code: "Delete", vk: 46 },
  ArrowLeft: { key: "ArrowLeft", code: "ArrowLeft", vk: 37 },
  ArrowUp: { key: "ArrowUp", code: "ArrowUp", vk: 38 },
  ArrowRight: { key: "ArrowRight", code: "ArrowRight", vk: 39 },
  ArrowDown: { key: "ArrowDown", code: "ArrowDown", vk: 40 },
  Home: { key: "Home", code: "Home", vk: 36 },
  End: { key: "End", code: "End", vk: 35 },
  PageUp: { key: "PageUp", code: "PageUp", vk: 33 },
  PageDown: { key: "PageDown", code: "PageDown", vk: 34 },
  Alt: { key: "Alt", code: "AltLeft", vk: 18 },
  Control: { key: "Control", code: "ControlLeft", vk: 17 },
  Meta: { key: "Meta", code: "MetaLeft", vk: 91 },
  Shift: { key: "Shift", code: "ShiftLeft", vk: 16 },
};

const modifierMap: Record<string, number> = {
  Alt: 1,
  Control: 2,
  Meta: 4,
  Shift: 8,
};

function normalizeModifierKey(key: string): string {
  const normalized = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
  switch (normalized) {
    case "Cmd":
    case "Command":
    case "Win":
    case "Windows":
      return "Meta";
    case "Ctrl":
      return "Control";
    case "Option":
      return "Alt";
    default:
      return normalized;
  }
}

function describeKey(key: string): {
  key: string;
  code?: string;
  vk?: number;
} {
  const isLetter = /^[a-zA-Z]$/.test(key);
  const isDigit = /^[0-9]$/.test(key);

  if (keyDefinitions[key]) {
    const def = keyDefinitions[key];
    return { key: def.key, code: def.code, vk: def.vk };
  }
  if (isLetter) {
    const upper = key.toUpperCase();
    return { key, code: `Key${upper}`, vk: upper.charCodeAt(0) };
  }
  if (isDigit) {
    return { key, code: `Digit${key}`, vk: key.charCodeAt(0) };
  }
  if (key === " ") {
    return { key: " ", code: "Space", vk: 32 };
  }
  // Fallback
  return { key };
}
// --- End helpers for keyPress ---

/**
 * Presses a single key or key combination (e.g., "A", "Enter", "Cmd+C", "Shift+Tab").
 * This is stateless and sends a single keyDown/keyUp pair with modifiers.
 */
export async function KEY_PRESS(
  tabId: number,
  key: string,
  options?: { delay?: number }
): Promise<void> {
  const delay = Math.max(0, options?.delay ?? 0);

  // Special case: if the entire string is just "+", treat it as the key
  const tokens = key === "+" ? ["+"] : key.split("+");

  let modifiers = 0;
  let mainKey = "";

  for (const token of tokens) {
    const normalized = normalizeModifierKey(token);
    if (modifierMap[normalized]) {
      modifiers |= modifierMap[normalized];
    } else {
      mainKey = normalized;
    }
  }

  // Describe the main key
  const desc = describeKey(mainKey);
  const hasNonShiftModifier = (modifiers & ~modifierMap.Shift) > 0;

  // For accelerators (Cmd+C), use "rawKeyDown".
  // For typing ('A', 'Shift+A'), use "keyDown" with text.
  const type =
    hasNonShiftModifier || mainKey.length > 1 ? "rawKeyDown" : "keyDown";

  const keyDownParams: Protocol.Input.DispatchKeyEventRequest = {
    type,
    modifiers,
    key: desc.key,
    code: desc.code,
    windowsVirtualKeyCode: desc.vk,
  } as Protocol.Input.DispatchKeyEventRequest;

  // Only add 'text' if it's the typing path
  if (type === "keyDown") {
    keyDownParams.text =
      modifiers & modifierMap.Shift
        ? mainKey.toUpperCase()
        : mainKey.toLowerCase();
    keyDownParams.unmodifiedText = mainKey.toLowerCase();
  }

  const keyUpParams: Protocol.Input.DispatchKeyEventRequest = {
    type: "keyUp",
    modifiers,
    key: desc.key,
    code: desc.code,
    windowsVirtualKeyCode: desc.vk,
  } as Protocol.Input.DispatchKeyEventRequest;

  await sendCommand(tabId, "Input.dispatchKeyEvent", keyDownParams);
  if (delay) await sleep(delay);
  await sendCommand(tabId, "Input.dispatchKeyEvent", keyUpParams);
}

/**
 * Captures a screenshot of the page.
 * @returns A base64-encoded string of the PNG image.
 */
export async function CAPTURE_SCREENSHOT(
  tabId: number,
  options?: { fullPage?: boolean }
): Promise<string> {
  let data: string;

  if (options?.fullPage) {
    // 1. Get layout metrics for the full page
    const { cssContentSize } =
      await sendCommand<Protocol.Page.GetLayoutMetricsResponse>(
        tabId,
        "Page.getLayoutMetrics"
      );

    // 2. Override device metrics to match full page
    await sendCommand(tabId, "Emulation.setDeviceMetricsOverride", {
      width: cssContentSize.width,
      height: cssContentSize.height,
      deviceScaleFactor: 1,
      mobile: false,
    } as Protocol.Emulation.SetDeviceMetricsOverrideRequest);

    // 3. Capture screenshot
    const result = await sendCommand<Protocol.Page.CaptureScreenshotResponse>(
      tabId,
      "Page.captureScreenshot",
      { format: "png", captureBeyondViewport: true }
    );
    data = result.data;

    // 4. Clear override
    await sendCommand(tabId, "Emulation.clearDeviceMetricsOverride", {});
  } else {
    // Capture screenshot of the visible viewport
    const result = await sendCommand<Protocol.Page.CaptureScreenshotResponse>(
      tabId,
      "Page.captureScreenshot",
      { format: "png" }
    );
    data = result.data;
  }
  return data;
}

/**
 * Sets the viewport size and device scale factor.
 */
// export async function setViewportSize(
//   tabId: number,
//   width: number,
//   height: number,
//   options?: { deviceScaleFactor?: number }
// ): Promise<void> {
//   const dsf = Math.max(0.01, options?.deviceScaleFactor ?? 1);
//   await sendCommand(tabId, "Emulation.setDeviceMetricsOverride", {
//     width,
//     height,
//     deviceScaleFactor: dsf,
//     mobile: false,
//     screenWidth: width,
//     screenHeight: height,
//   } as Protocol.Emulation.SetDeviceMetricsOverrideRequest);
// }

/**
 * Evaluates a function in the main frame of the page.
 * The function is executed in an isolated world.
 */
// export async function evaluate<R, Arg>(
//   tabId: number,
//   mainFrameId: string,
//   pageFunction: (arg: Arg) => R | Promise<R>,
//   arg?: Arg
// ): Promise<R> {
//   // 1. Create an isolated world
//   const { executionContextId } =
//     await sendCommand<Protocol.Page.CreateIsolatedWorldResponse>(
//       tabId,
//       "Page.createIsolatedWorld",
//       { frameId: mainFrameId, worldName: "v3-utility-world" }
//     );

//   // 2. Build the expression to execute
//   const fnSrc = pageFunction.toString();
//   const argJson = JSON.stringify(arg);
//   const expression = `(() => {
//     const __fn = ${fnSrc};
//     const __arg = ${argJson};
//     try {
//       const __res = __fn(__arg);
//       // Handle both sync and async return values
//       return Promise.resolve(__res).then(v => {
//         // Try to deep-serialize the result
//         try { return JSON.parse(JSON.stringify(v)); } catch { return v; }
//       });
//     } catch (e) { throw e; }
//   })()`;

//   // 3. Evaluate the expression
//   const { result, exceptionDetails } =
//     await sendCommand<Protocol.Runtime.EvaluateResponse>(
//       tabId,
//       "Runtime.evaluate",
//       {
//         expression,
//         contextId: executionContextId,
//         returnByValue: true,
//         awaitPromise: true,
//       }
//     );

//   if (exceptionDetails) {
//     const msg =
//       exceptionDetails.text ||
//       exceptionDetails.exception?.description ||
//       "Evaluation failed";
//     throw new Error(msg);
//   }

//   return result?.value as R;
// }
