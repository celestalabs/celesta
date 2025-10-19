import { createGmailClient } from '../gmailClient.ts';
import type { GmailAuth, ListMessagesParams, GmailMessageListResponse } from '../gmailIntegration.ts';

export async function listMessages(
  params: ListMessagesParams,
  auth: GmailAuth
): Promise<GmailMessageListResponse> {
  const client = createGmailClient(auth);
  const gmail = client.getGmailApi();

  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults: params.maxResults || 10,
    ...(params.pageToken && { pageToken: params.pageToken }),
    ...(params.labelIds && { labelIds: params.labelIds }),
    includeSpamTrash: params.includeSpamTrash || false,
  });

  return {
    messages: (response.data.messages || []).map(msg => ({
      id: msg.id!,
      threadId: msg.threadId!,
    })),
    nextPageToken: response.data.nextPageToken ?? undefined,
    resultSizeEstimate: response.data.resultSizeEstimate || 0,
  };
}
