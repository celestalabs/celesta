import { createGmailClient } from '../gmailClient.ts';
import type { GmailAuth, GmailMessage } from '../gmailIntegration.ts';

export interface SearchAndRetrieveMessagesParams {
  query: string;
  maxResults?: number;
  pageToken?: string;
  labelIds?: string[];
  format?: 'full' | 'metadata' | 'minimal';
}

export interface SearchAndRetrieveMessagesResponse {
  messages: GmailMessage[];
  nextPageToken?: string | undefined;
  resultSizeEstimate: number;
}

/**
 * Combined action that searches for messages AND retrieves their full content.
 * This prevents the LLM from needing to make 200+ separate getMessage calls.
 * 
 * Limits:
 * - Default maxResults: 10
 * - Maximum maxResults: 50 (to prevent excessive API calls)
 */
export async function searchAndRetrieveMessages(
  params: SearchAndRetrieveMessagesParams,
  auth: GmailAuth
): Promise<SearchAndRetrieveMessagesResponse> {
  const client = createGmailClient(auth);
  const gmail = client.getGmailApi();

  // Enforce reasonable limits
  const maxResults = Math.min(params.maxResults || 10, 50);

  // Step 1: Search for message IDs
  const listResponse = await gmail.users.messages.list({
    userId: 'me',
    q: params.query,
    maxResults,
    ...(params.pageToken && { pageToken: params.pageToken }),
    ...(params.labelIds && { labelIds: params.labelIds }),
  });

  const messageIds = (listResponse.data.messages || []).map(msg => msg.id!);

  // Step 2: Retrieve full content for all messages in parallel
  const messages = await Promise.all(
    messageIds.map(async (messageId) => {
      const messageResponse = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: params.format || 'full',
      });
      return messageResponse.data as GmailMessage;
    })
  );

  return {
    messages,
    nextPageToken: listResponse.data.nextPageToken ?? undefined,
    resultSizeEstimate: listResponse.data.resultSizeEstimate || 0,
  };
}
