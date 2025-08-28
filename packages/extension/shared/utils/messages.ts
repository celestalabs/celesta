type Message<T extends string, C extends object = {}> = C & {
  __isMessage: true;
  __messageType: T;
};

export const isMessage = (
  maybeMessage: any
): maybeMessage is Message<string, Record<string | number | symbol, any>> =>
  maybeMessage != null &&
  typeof maybeMessage === "object" &&
  maybeMessage.__isMessage === true;

export type MessageResponseIdTuple = [Message<string, object>, string | null];

export const isMessageResponseIdTuple = (
  maybeMessageResponseIdTuple: any
): maybeMessageResponseIdTuple is MessageResponseIdTuple =>
  Array.isArray(maybeMessageResponseIdTuple) &&
  isMessage(maybeMessageResponseIdTuple[0]) &&
  (maybeMessageResponseIdTuple[1] === null ||
    typeof maybeMessageResponseIdTuple[1] === "string");
/**
 * Helper for sending a message and expecting a response through another response message.
 */
let uid = 1;

type MessageType = "runtime" | ["tabs", tabId: number];
export const sendMessage = <T extends string, C extends object>(
  target: MessageType,
  message: Omit<Message<T, C>, "responseMessageId">,
  expectingResponse: boolean
) =>
  new Promise<ResponseMessage>((resolve, reject) => {
    uid++;
    const responseMessageId = uid + `-responseMessage-` + Date.now();

    if (expectingResponse) {
      let TIMED_OUT_INTERVAL: ReturnType<typeof setTimeout> | null = null;
      const responseMessageHandler = (maybeMessage: any) => {
        // Some other message; not the response
        if (
          !isResponseMessage(maybeMessage) ||
          maybeMessage.responseMessageId !== responseMessageId
        ) {
          return;
        }

        console.log(
          `[RECEIVED RESPONSE TO ${responseMessageId}]:`,
          maybeMessage
        );

        browser.runtime.onMessage.removeListener(responseMessageHandler);
        TIMED_OUT_INTERVAL != null && clearTimeout(TIMED_OUT_INTERVAL);
        resolve(maybeMessage);
      };

      TIMED_OUT_INTERVAL = setTimeout(() => {
        console.log(`[RESPONSE TO ${responseMessageId}] TIMED OUT.`);

        browser.runtime.onMessage.removeListener(responseMessageHandler);
        reject("Request timed out.");
      }, 5000);

      browser.runtime.onMessage.addListener(responseMessageHandler);
    }

    console.log(`[SENDING MESSAGE ${responseMessageId}]`, message);

    if (target === "runtime") {
      browser.runtime.sendMessage([message, responseMessageId]);
    } else {
      browser.tabs.sendMessage(target[1], [message, responseMessageId]);
    }
    if (!expectingResponse) {
      resolve({
        __isMessage: true,
        __messageType: "ResponseMessage",
        responseMessageId: null,
        payload: null,
      });
    }
  });

/**
 * ResponseMessage when returning a value via message passing
 */
export type ResponseMessage = Message<
  "ResponseMessage",
  { responseMessageId: string | null; payload: any }
>;

export const isResponseMessage = (
  maybeMessage: any
): maybeMessage is ResponseMessage =>
  isMessage(maybeMessage) && maybeMessage.__messageType === "ResponseMessage";

/**
 * CheckActiveTabMessage self-explanatory
 */

export type CheckActiveTabMessage = Message<"CheckActiveTabMessage">;

export const isCheckActiveTabMessage = (
  maybeMessage: any
): maybeMessage is CheckActiveTabMessage =>
  isMessage(maybeMessage) &&
  maybeMessage.__messageType === "CheckActiveTabMessage";

/**
 * AgentActionMessage sent to perform action in active tab
 */

export type AgentActionMessage = Message<
  "AgentActionMessage",
  | {
      action: "getPageContent";
    }
  | {
      action: "getElementSelectorFromXPath";
      xPath: string;
    }
>;

export const isAgentActionMessage = (
  maybeMessage: any
): maybeMessage is AgentActionMessage =>
  isMessage(maybeMessage) &&
  maybeMessage.__messageType === "AgentActionMessage";

export type TriggerMicrophoneInputMessage =
  Message<"TriggerMicrophoneInputMessage">;

export const isTriggerMicrophoneInputMessage = (
  maybeMessage: any
): maybeMessage is TriggerMicrophoneInputMessage =>
  isMessage(maybeMessage) &&
  maybeMessage.__messageType === "TriggerMicrophoneInputMessage";
