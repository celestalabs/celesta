import { IncomingWSMessage } from "@celesta/types";

export function isIncomingWSMessage(msg: any): msg is IncomingWSMessage {
  if (!msg || typeof msg !== "object" || typeof msg.type !== "string")
    return false;
  switch (msg.type) {
    case "USER_MESSAGE":
      return msg.contextId === "CHAT" && typeof msg.content === "string";
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
        typeof msg.contextId === "string" &&
        (msg.contextId.startsWith("WORKFLOW_") || msg.contextId === "CHAT") &&
        typeof msg.requestId === "string" &&
        msg.requestId.startsWith("REQUEST_")
      );
    case "PROVIDE_SHOULD_START_WORKFLOW":
      return (
        msg.type === "PROVIDE_SHOULD_START_WORKFLOW" &&
        typeof msg.contextId === "string" &&
        (msg.contextId.startsWith("WORKFLOW_") || msg.contextId === "CHAT") &&
        typeof msg.requestId === "string" &&
        msg.requestId.startsWith("REQUEST_") &&
        typeof msg.yes === "boolean"
      );
    default:
      return false;
  }
}
