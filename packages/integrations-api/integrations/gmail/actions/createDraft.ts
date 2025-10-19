import { createGmailClient } from '../gmailClient.ts';
import { convertMarkdownToHtmlIfNeeded } from '../utils.ts';
import type { GmailAuth, CreateDraftParams, GmailDraft } from '../gmailIntegration.ts';

export async function createDraft(
  params: CreateDraftParams,
  auth: GmailAuth
): Promise<GmailDraft> {
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
  });

  // Encode to base64url
  const encodedMessage = client.encodeMessage(mimeMessage);

  // Create the draft
  const response = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: {
      message: {
        raw: encodedMessage,
      },
    },
  });

  return response.data as GmailDraft;
}
