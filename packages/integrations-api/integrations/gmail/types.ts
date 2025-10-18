export interface GmailAuth {
  access_token: string;
}

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  filename: string;
  mimeType: string;
  data: string; // base64 encoded
}

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  body: string;
  isHtml?: boolean;
  cc?: string | string[];
  bcc?: string | string[];
  from?: string;
  attachments?: EmailAttachment[];
}

export interface SearchMessagesParams {
  query: string;
  maxResults?: number;
  pageToken?: string;
  labelIds?: string[];
}

export interface GetMessageParams {
  messageId: string;
  format?: 'full' | 'metadata' | 'minimal' | 'raw';
}

export interface ListMessagesParams {
  maxResults?: number;
  pageToken?: string;
  labelIds?: string[];
  includeSpamTrash?: boolean;
}

export interface CreateDraftParams {
  to: string | string[];
  subject: string;
  body: string;
  isHtml?: boolean;
  cc?: string | string[];
  bcc?: string | string[];
}

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet: string;
  historyId?: string;
  internalDate?: string;
  payload?: GmailMessagePayload;
  sizeEstimate?: number;
  raw?: string;
}

export interface GmailMessagePayload {
  partId?: string;
  mimeType: string;
  filename?: string;
  headers: GmailHeader[];
  body?: GmailMessageBody;
  parts?: GmailMessagePayload[];
}

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailMessageBody {
  attachmentId?: string;
  size: number;
  data?: string; // base64url encoded
}

export interface GmailMessageListResponse {
  messages: Array<{ id: string; threadId: string }>;
  nextPageToken?: string | undefined;
  resultSizeEstimate: number;
}

export interface GmailDraft {
  id: string;
  message: GmailMessage;
}

export interface SendEmailResponse {
  id: string;
  threadId: string;
  labelIds: string[];
}
