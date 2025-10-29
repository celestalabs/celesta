import { createGmailClient } from "../gmailClient.ts";
import type {
  GmailAuth,
  SendEmailParams,
  SendEmailResponse,
} from "../gmailIntegration.ts";
import { convertMarkdownToHtmlIfNeeded } from "../utils.ts";

export async function sendEmail(
  params: SendEmailParams,
  auth: GmailAuth
): Promise<SendEmailResponse> {
  const client = createGmailClient(auth);
  const gmail = client.getGmailApi();

  // Auto-detect markdown and convert to HTML if needed
  const { body, isHtml } = await convertMarkdownToHtmlIfNeeded(
    params.body,
    params.isHtml
  );

  // Create MIME message
  const mimeMessage = client.createMimeMessage({
    to: params.to,
    subject: params.subject,
    body,
    ...(isHtml !== undefined && { isHtml }),
    ...(params.cc && { cc: params.cc }),
    ...(params.bcc && { bcc: params.bcc }),
    ...(params.from && { from: params.from }),
  });

  // Encode to base64url
  const encodedMessage = client.encodeMessage(mimeMessage);

  // Send the message
  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodedMessage,
    },
  });

  return {
    id: response.data.id!,
    threadId: response.data.threadId!,
    labelIds: response.data.labelIds || [],
  };
}
