import { createGmailClient } from '../gmailClient.ts';
import type { GmailAuth, SearchMessagesParams, GmailMessageListResponse } from '../types.ts';

export async function searchMessages(
  params: SearchMessagesParams,
  auth: GmailAuth
): Promise<GmailMessageListResponse> {
  const client = createGmailClient(auth);
  const gmail = client.getGmailApi();

  const response = await gmail.users.messages.list({
    userId: 'me',
    q: params.query,
    maxResults: params.maxResults || 10,
    ...(params.pageToken && { pageToken: params.pageToken }),
    ...(params.labelIds && { labelIds: params.labelIds }),
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
