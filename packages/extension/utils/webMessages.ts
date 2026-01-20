import { logger } from "@celesta/common";

const log = logger("webMessages");

type WebMessage<T extends string, C extends object = {}> = C & {
  __isWebMessage: true;
  __webMessageType: T;
};

export const isWebMessage = (
  maybeWebMessage: any
): maybeWebMessage is WebMessage<
  string,
  Record<string | number | symbol, any>
> =>
  maybeWebMessage != null &&
  typeof maybeWebMessage === "object" &&
  maybeWebMessage.__isWebMessage === true;

export type WebMessageResponseIdTuple = [
  WebMessage<string, object>,
  string | null,
];

export const isWebMessageResponseIdTuple = (
  maybeWebMessageResponseIdTuple: any
): maybeWebMessageResponseIdTuple is WebMessageResponseIdTuple =>
  Array.isArray(maybeWebMessageResponseIdTuple) &&
  isWebMessage(maybeWebMessageResponseIdTuple[0]) &&
  (maybeWebMessageResponseIdTuple[1] === null ||
    typeof maybeWebMessageResponseIdTuple[1] === "string");
/**
 * Helper for sending a WebMessage and expecting a response through another response WebMessage.
 */
let uid = 1;

type WebMessageType = "runtime" | ["tabs", tabId: number];
export const sendWebMessage = <T extends string, C extends object>(
  target: WebMessageType,
  webMessage: WebMessage<T, C>,
  expectingResponse: boolean
) =>
  new Promise<ResponseWebMessage>((resolve, reject) => {
    uid++;
    const responseWebMessageId = uid + `-responseWebMessage-` + Date.now();

    if (expectingResponse) {
      let TIMED_OUT_INTERVAL: ReturnType<typeof setTimeout> | null = null;
      const responseWebMessageHandler = (maybeWebMessage: any) => {
        // Some other WebMessage; not the response
        if (
          !isResponseWebMessage(maybeWebMessage) ||
          maybeWebMessage.responseWebMessageId !== responseWebMessageId
        ) {
          return;
        }

        log(`[RECEIVED RESPONSE TO ${responseWebMessageId}]:`, maybeWebMessage);

        browser.runtime.onMessage.removeListener(responseWebMessageHandler);
        TIMED_OUT_INTERVAL != null && clearTimeout(TIMED_OUT_INTERVAL);
        resolve(maybeWebMessage);
      };

      TIMED_OUT_INTERVAL = setTimeout(() => {
        log(`[RESPONSE TO ${responseWebMessageId}] TIMED OUT.`);

        browser.runtime.onMessage.removeListener(responseWebMessageHandler);
        reject("Request timed out.");
      }, 5000);

      browser.runtime.onMessage.addListener(responseWebMessageHandler);
    }

    log(`[SENDING WebMessage ${responseWebMessageId}]`, webMessage);

    if (target === "runtime") {
      browser.runtime.sendMessage([webMessage, responseWebMessageId]);
    } else {
      browser.tabs.sendMessage(target[1], [webMessage, responseWebMessageId]);
    }
    if (!expectingResponse) {
      resolve({
        __isWebMessage: true,
        __webMessageType: "ResponseWebMessage",
        responseWebMessageId: null,
        payload: null,
      });
    }
  });

/**
 * ResponseWebMessage when returning a value via WebMessage passing
 */
export type ResponseWebMessage = WebMessage<
  "ResponseWebMessage",
  { responseWebMessageId: string | null; payload: any }
>;

export const isResponseWebMessage = (
  maybeWebMessage: any
): maybeWebMessage is ResponseWebMessage =>
  isWebMessage(maybeWebMessage) &&
  maybeWebMessage.__webMessageType === "ResponseWebMessage";

/**
 * CheckActiveTabWebMessage self-explanatory
 */

export type CheckActiveTabWebMessage = WebMessage<"CheckActiveTabWebMessage">;

export const isCheckActiveTabWebMessage = (
  maybeWebMessage: any
): maybeWebMessage is CheckActiveTabWebMessage =>
  isWebMessage(maybeWebMessage) &&
  maybeWebMessage.__webMessageType === "CheckActiveTabWebMessage";

/**
 * AgentActionMessage sent to perform action in active tab
 */

export type AgentActionWebMessage = WebMessage<
  "AgentActionWebMessage",
  | {
      action: "getPageContent";
    }
  | {
      action: "scrollDocument";
      deltaX: number;
      deltaY: number;
    }
  | {
      action: "startAgent";
    }
>;

export const isAgentActionWebMessage = (
  maybeWebMessage: any
): maybeWebMessage is AgentActionWebMessage =>
  isWebMessage(maybeWebMessage) &&
  maybeWebMessage.__webMessageType === "AgentActionWebMessage";

export type TriggerMicrophoneInputWebMessage =
  WebMessage<"TriggerMicrophoneInputWebMessage">;

export const isTriggerMicrophoneInputWebMessage = (
  maybeWebMessage: any
): maybeWebMessage is TriggerMicrophoneInputWebMessage =>
  isWebMessage(maybeWebMessage) &&
  maybeWebMessage.__webMessageType === "TriggerMicrophoneInputWebMessage";
