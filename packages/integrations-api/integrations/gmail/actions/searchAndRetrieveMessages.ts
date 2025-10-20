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
  messages: string; // Natural language markdown format
  messageCount: number;
  nextPageToken?: string | undefined;
  resultSizeEstimate: number;
}

/**
 * Converts Gmail message to natural language markdown format.
 * This dramatically reduces token usage compared to verbose JSON structure.
 */
function formatMessageAsMarkdown(message: GmailMessage): string {
  const headers = message.payload?.headers || [];
  const getHeader = (name: string) => headers.find(h => h.name === name)?.value || '';

  const from = getHeader('From');
  const to = getHeader('To');
  const cc = getHeader('Cc');
  const subject = getHeader('Subject');
  const date = getHeader('Date');
  
  // Extract body content
  let body = message.snippet || '';
  if (message.payload?.body?.data) {
    try {
      body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
    } catch {
      body = message.snippet || '';
    }
  } else if (message.payload?.parts) {
    // Find text/plain or text/html part
    const findTextPart = (parts: any[]): string => {
      for (const part of parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          try {
            return Buffer.from(part.body.data, 'base64').toString('utf-8');
          } catch {}
        }
        if (part.parts) {
          const text = findTextPart(part.parts);
          if (text) return text;
        }
      }
      return '';
    };
    body = findTextPart(message.payload.parts) || message.snippet || '';
  }

  // Format as natural language markdown
  let markdown = `## Email: ${subject}\n\n`;
  markdown += `**From:** ${from}\n`;
  markdown += `**To:** ${to}\n`;
  if (cc) markdown += `**Cc:** ${cc}\n`;
  markdown += `**Date:** ${date}\n`;
  markdown += `**Message ID:** ${message.id}\n\n`;
  markdown += `**Content:**\n${body}\n\n`;
  markdown += `---\n\n`;

  return markdown;
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

  // Step 2: Retrieve content for all messages in parallel
  // Default to 'metadata' format to prevent token overflow (full email bodies can be huge)
  // Use 'full' only when you specifically need the complete email body content
  const messages = await Promise.all(
    messageIds.map(async (messageId) => {
      const messageResponse = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: params.format || 'metadata',
      });
      return messageResponse.data as GmailMessage;
    })
  );

  // Convert all messages to natural language markdown
  const markdownOutput = messages.map(msg => formatMessageAsMarkdown(msg)).join('');

  return {
    messages: markdownOutput,
    messageCount: messages.length,
    nextPageToken: listResponse.data.nextPageToken ?? undefined,
    resultSizeEstimate: listResponse.data.resultSizeEstimate || 0,
  };
}
