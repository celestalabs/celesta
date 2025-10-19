import z from 'zod';
import type { IntegrationMetadata } from '../integrationMetadata.ts';
import type { GmailAuth } from './types.ts';
import { sendEmail } from './actions/sendEmail.ts';
import { searchMessages } from './actions/searchMessages.ts';
import { getMessage } from './actions/getMessage.ts';
import { listMessages } from './actions/listMessages.ts';
import { createDraft } from './actions/createDraft.ts';

// Define Zod schemas for each action's input
const sendEmailSchema = z.object({
  to: z.union([z.string(), z.array(z.string())]).describe('Recipient email address(es)'),
  subject: z.string().describe('Email subject'),
  body: z.string().describe('Email body content'),
  isHtml: z.boolean().optional().describe('Whether the body is HTML formatted'),
  cc: z.union([z.string(), z.array(z.string())]).optional().describe('CC recipient email address(es)'),
  bcc: z.union([z.string(), z.array(z.string())]).optional().describe('BCC recipient email address(es)'),
  from: z.string().optional().describe('Sender email address (defaults to authenticated user)'),
});

const searchMessagesSchema = z.object({
  query: z.string().describe('Gmail search query (uses Gmail search syntax)'),
  maxResults: z.number().optional().describe('Maximum number of messages to return (default: 10)'),
  pageToken: z.string().optional().describe('Page token for pagination'),
  labelIds: z.array(z.string()).optional().describe('Filter by label IDs'),
});

const getMessageSchema = z.object({
  messageId: z.string().describe('The ID of the message to retrieve'),
  format: z.enum(['full', 'metadata', 'minimal', 'raw']).optional().describe('The format of the message to return (default: full)'),
});

const listMessagesSchema = z.object({
  maxResults: z.number().optional().describe('Maximum number of messages to return (default: 10)'),
  pageToken: z.string().optional().describe('Page token for pagination'),
  labelIds: z.array(z.string()).optional().describe('Filter by label IDs'),
  includeSpamTrash: z.boolean().optional().describe('Include messages from SPAM and TRASH (default: false)'),
});

const createDraftSchema = z.object({
  to: z.union([z.string(), z.array(z.string())]).describe('Recipient email address(es)'),
  subject: z.string().describe('Email subject'),
  body: z.string().describe('Email body content'),
  isHtml: z.boolean().optional().describe('Whether the body is HTML formatted'),
  cc: z.union([z.string(), z.array(z.string())]).optional().describe('CC recipient email address(es)'),
  bcc: z.union([z.string(), z.array(z.string())]).optional().describe('BCC recipient email address(es)'),
});

// Define the Gmail integration
export const gmailIntegration: IntegrationMetadata = {
  name: 'Gmail',
  description: 'Send and manage emails using Gmail',
  logoUrl: 'https://www.google.com/gmail/about/static/images/logo-gmail.png',
  requiresUserAuth: true,
  actions: [
    {
      name: 'send_email',
      description: 'Send an email message',
      props: sendEmailSchema,
    },
    {
      name: 'search_messages',
      description: 'Search for email messages using Gmail search syntax',
      props: searchMessagesSchema,
    },
    {
      name: 'get_message',
      description: 'Get a specific email message by ID',
      props: getMessageSchema,
    },
    {
      name: 'list_messages',
      description: 'List email messages in the mailbox',
      props: listMessagesSchema,
    },
    {
      name: 'create_draft',
      description: 'Create a draft email message',
      props: createDraftSchema,
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
