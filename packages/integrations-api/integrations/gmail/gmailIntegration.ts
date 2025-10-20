import z from "zod";
import type { IntegrationMetadata } from "../integrationMetadata.ts";
import { sendEmail } from "./actions/sendEmail.ts";
import { searchMessages } from "./actions/searchMessages.ts";
import { getMessage } from "./actions/getMessage.ts";
import { listMessages } from "./actions/listMessages.ts";
import { createDraft } from "./actions/createDraft.ts";
import { searchAndRetrieveMessages } from "./actions/searchAndRetrieveMessages.ts";
import { listAndRetrieveMessages } from "./actions/listAndRetrieveMessages.ts";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

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

// ============================================================================
// ZOD SCHEMAS (for API validation and LLM tool definitions)
// ============================================================================
const sendEmailSchema = z.object({
  to: z
    .union([z.string(), z.array(z.string())])
    .describe("Recipient email address(es)"),
  subject: z.string().describe("Email subject"),
  body: z.string().describe("Email body content"),
  isHtml: z.boolean().optional().describe("Whether the body is HTML formatted"),
  cc: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe("CC recipient email address(es)"),
  bcc: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe("BCC recipient email address(es)"),
  from: z
    .string()
    .optional()
    .describe("Sender email address (defaults to authenticated user)"),
});

const searchMessagesSchema = z.object({
  query: z.string().describe("Gmail search query (uses Gmail search syntax)"),
  maxResults: z
    .number()
    .optional()
    .describe("Maximum number of messages to return (default: 10)"),
  pageToken: z.string().optional().describe("Page token for pagination"),
  labelIds: z.array(z.string()).optional().describe("Filter by label IDs"),
});

const getMessageSchema = z.object({
  messageId: z.string().describe("The ID of the message to retrieve"),
  format: z
    .enum(["full", "metadata", "minimal", "raw"])
    .optional()
    .describe("The format of the message to return (default: full)"),
});

const listMessagesSchema = z.object({
  maxResults: z
    .number()
    .optional()
    .describe("Maximum number of messages to return (default: 10)"),
  pageToken: z.string().optional().describe("Page token for pagination"),
  labelIds: z.array(z.string()).optional().describe("Filter by label IDs"),
  includeSpamTrash: z
    .boolean()
    .optional()
    .describe("Include messages from SPAM and TRASH (default: false)"),
});

const createDraftSchema = z.object({
  to: z
    .union([z.string(), z.array(z.string())])
    .describe("Recipient email address(es)"),
  subject: z.string().describe("Email subject"),
  body: z.string().describe("Email body content"),
  isHtml: z.boolean().optional().describe("Whether the body is HTML formatted"),
  cc: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe("CC recipient email address(es)"),
  bcc: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe("BCC recipient email address(es)"),
});

const searchAndRetrieveMessagesSchema = z.object({
  query: z.string().describe("Gmail search query (uses Gmail search syntax)"),
  maxResults: z
    .number()
    .optional()
    .describe("Maximum number of messages to return (default: 10, max: 50)"),
  pageToken: z.string().optional().describe("Page token for pagination"),
  labelIds: z.array(z.string()).optional().describe("Filter by label IDs"),
  format: z
    .enum(["full", "metadata", "minimal"])
    .optional()
    .describe("The format of the message to return (default: metadata). Use 'metadata' for headers/subject/snippet, 'full' for complete email body (warning: can be very large)"),
});

const listAndRetrieveMessagesSchema = z.object({
  maxResults: z
    .number()
    .optional()
    .describe("Maximum number of messages to return (default: 10, max: 50)"),
  pageToken: z.string().optional().describe("Page token for pagination"),
  labelIds: z.array(z.string()).optional().describe("Filter by label IDs"),
  includeSpamTrash: z
    .boolean()
    .optional()
    .describe("Include messages from SPAM and TRASH (default: false)"),
  format: z
    .enum(["full", "metadata", "minimal"])
    .optional()
    .describe("The format of the message to return (default: metadata). Use 'metadata' for headers/subject/snippet, 'full' for complete email body (warning: can be very large)"),
});

// ============================================================================
// INFERRED TYPES FROM ZOD SCHEMAS
// ============================================================================

export type SendEmailParams = z.infer<typeof sendEmailSchema>;
export type SearchMessagesParams = z.infer<typeof searchMessagesSchema>;
export type GetMessageParams = z.infer<typeof getMessageSchema>;
export type ListMessagesParams = z.infer<typeof listMessagesSchema>;
export type CreateDraftParams = z.infer<typeof createDraftSchema>;
export type SearchAndRetrieveMessagesParams = z.infer<
  typeof searchAndRetrieveMessagesSchema
>;
export type ListAndRetrieveMessagesParams = z.infer<
  typeof listAndRetrieveMessagesSchema
>;

// ============================================================================
// INTEGRATION METADATA
// ============================================================================

// Define the Gmail integration
export const gmailIntegration: IntegrationMetadata = {
  name: "Gmail",
  description: "Send and manage emails using Gmail",
  logoUrl: "https://www.google.com/gmail/about/static/images/logo-gmail.png",
  requiresUserAuth: true,
  actions: [
    {
      name: "send_email",
      description: "Send an email message",
      props: sendEmailSchema,
    },
    {
      name: "search_messages",
      description: "Search for email messages using Gmail search syntax",
      props: searchMessagesSchema,
    },
    {
      name: "get_message",
      description: "Get a specific email message by ID",
      props: getMessageSchema,
    },
    {
      name: "list_messages",
      description:
        "List email messages in the mailbox. This method only returns message IDs.",
      props: listMessagesSchema,
    },
    {
      name: "create_draft",
      description: "Create a draft email message",
      props: createDraftSchema,
    },
    {
      name: "search_and_retrieve_messages",
      description:
        "Search for email messages AND retrieve their content (headers, subject, snippet) in one action. More efficient than search_messages + get_message. Supports up to 50 messages. Default format: metadata (compact). Use format: full only when you need complete email body content.",
      props: searchAndRetrieveMessagesSchema,
    },
    {
      name: "list_and_retrieve_messages",
      description:
        "List email messages AND retrieve their content (headers, subject, snippet) in one action. More efficient than list_messages + get_message. Supports up to 50 messages. Default format: metadata (compact). Use format: full only when you need complete email body content.",
      props: listAndRetrieveMessagesSchema,
    },
  ],
};

// Export action executors
export const gmailActions = {
  send_email: sendEmail,
  search_messages: searchMessages,
  get_message: getMessage,
  list_messages: listMessages,
  create_draft: createDraft,
  search_and_retrieve_messages: searchAndRetrieveMessages,
  list_and_retrieve_messages: listAndRetrieveMessages,
} as const;

// Type-safe action executor
export async function executeGmailAction(
  actionName: string,
  props: object,
  auth: GmailAuth
): Promise<any> {
  const action = gmailActions[actionName as keyof typeof gmailActions];
  if (!action) {
    throw new Error(`Unknown Gmail action: ${actionName}`);
  }
  return action(props as any, auth);
}
