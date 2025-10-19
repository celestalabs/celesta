import { createGmailClient } from '../gmailClient.ts';
import type { GmailAuth, GmailMessage } from '../gmailIntegration.ts';

export interface ListAndRetrieveMessagesParams {
  maxResults?: number;
  pageToken?: string;
  labelIds?: string[];
  includeSpamTrash?: boolean;
  format?: 'full' | 'metadata' | 'minimal';
}

export interface ListAndRetrieveMessagesResponse {
  messages: GmailMessage[];
  nextPageToken?: string | undefined;
  resultSizeEstimate: number;
}

/**
 * Combined action that lists messages AND retrieves their full content.
 * This prevents the LLM from needing to make 200+ separate getMessage calls.
 * 
 * Limits:
 * - Default maxResults: 10
 * - Maximum maxResults: 50 (to prevent excessive API calls)
 */
export async function listAndRetrieveMessages(
  params: ListAndRetrieveMessagesParams,
  auth: GmailAuth
): Promise<ListAndRetrieveMessagesResponse> {
  const client = createGmailClient(auth);
  const gmail = client.getGmailApi();

  // Enforce reasonable limits
  const maxResults = Math.min(params.maxResults || 10, 50);

  // Step 1: List message IDs
  const listResponse = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    ...(params.pageToken && { pageToken: params.pageToken }),
    ...(params.labelIds && { labelIds: params.labelIds }),
    ...(params.includeSpamTrash !== undefined && { includeSpamTrash: params.includeSpamTrash }),
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
