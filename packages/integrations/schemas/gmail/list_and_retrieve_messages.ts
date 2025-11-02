// Auto-generated schema for gmail.list_and_retrieve_messages
// Generated on: 2025-11-01T09:49:26.901Z

import { z } from "zod";

export const list_and_retrieve_messagesSchema = z
  .object({
    maxResults: z
      .number()
      .describe("Maximum number of messages to return (default: 10, max: 50)")
      .optional(),
    pageToken: z.string().describe("Page token for pagination").optional(),
    labelIds: z.array(z.string()).describe("Filter by label IDs").optional(),
    includeSpamTrash: z
      .boolean()
      .describe("Include messages from SPAM and TRASH (default: false)")
      .optional(),
    format: z
      .enum(["full", "metadata", "minimal"])
      .describe(
        "The format of the message to return (default: metadata). Use 'metadata' for headers/subject/snippet, 'full' for complete email body (warning: can be very large)"
      )
      .optional(),
  })
  .strict();

export type list_and_retrieve_messagesInput = z.infer<
  typeof list_and_retrieve_messagesSchema
>;
