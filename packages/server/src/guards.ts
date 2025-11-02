import {
  isChatId,
  isWorkflowId,
  type FrontendWSMessage,
} from "@celesta/common";

//@TODO make this zod in future?
export function isFrontendWSMessage(msg: any): msg is FrontendWSMessage {
  if (!msg || typeof msg !== "object" || typeof msg.type !== "string")
    return false;
  switch (msg.type) {
    case "USER_MESSAGE":
      return (
        isChatId(msg.contextId) &&
        typeof msg.data === "object" &&
        msg.data !== null
      );
    case "PROVIDE_CREDENTIALS":
      return (
        msg.type === "PROVIDE_CREDENTIALS" &&
        typeof msg.integrationName === "string" &&
        typeof msg.accessToken === "string" &&
        typeof msg.requestId === "string" &&
        msg.requestId.startsWith("REQUEST_")
      );
    case "PROVIDE_QUESTION_RESPONSE":
      return (
        msg.type === "PROVIDE_QUESTION_RESPONSE" &&
        typeof msg.response === "string" &&
        (isChatId(msg.contextId) || isWorkflowId(msg.contextId)) &&
        typeof msg.requestId === "string" &&
        msg.requestId.startsWith("REQUEST_")
      );
    case "PROVIDE_SHOULD_START_WORKFLOW":
      return (
        msg.type === "PROVIDE_SHOULD_START_WORKFLOW" &&
        typeof msg.contextId === "string" &&
        (isWorkflowId(msg.contextId) || isChatId(msg.contextId)) &&
        typeof msg.requestId === "string" &&
        msg.requestId.startsWith("REQUEST_") &&
        typeof msg.yes === "boolean"
      );
    case "PROVIDE_BROWSER_CONTEXT_ACTION":
      return (
        msg.type === "PROVIDE_BROWSER_CONTEXT_ACTION" &&
        typeof msg.requestId === "string" &&
        msg.requestId.startsWith("REQUEST_") &&
        typeof msg.response === "object"
      );
    case "PROVIDE_BROWSER_AGENT_ACTION": {
      return (
        msg.type === "PROVIDE_BROWSER_AGENT_ACTION" &&
        typeof msg.requestId === "string" &&
        msg.requestId.startsWith("REQUEST_") &&
        typeof msg.response === "object"
      );
    }

    case "REQUEST_WORKFLOW": {
      return typeof msg.prompt === "string";
    }

    default:
      return false;
  }
}
