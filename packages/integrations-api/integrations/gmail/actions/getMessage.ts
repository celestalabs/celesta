import { createGmailClient } from "../gmailClient.ts";
import type {
  GmailAuth,
  GetMessageParams,
  GmailMessage,
} from "../gmailIntegration.ts";

export async function getMessage(
  params: GetMessageParams,
  auth: GmailAuth
): Promise<GmailMessage> {
  const client = createGmailClient(auth);
  const gmail = client.getGmailApi();

  const response = await gmail.users.messages.get({
    userId: "me",
    id: params.messageId,
    format: params.format || "full",
  });

  return response.data as GmailMessage;
}
