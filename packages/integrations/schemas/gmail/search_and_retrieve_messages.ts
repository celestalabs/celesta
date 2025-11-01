// Auto-generated schema for gmail.search_and_retrieve_messages
// Generated on: 2025-11-01T09:49:26.901Z

import { z } from "zod";

export const search_and_retrieve_messagesSchema = z
  .object({
    query: z.string().describe("Gmail search query (uses Gmail search syntax)"),
    maxResults: z
      .number()
      .describe("Maximum number of messages to return (default: 10, max: 50)")
      .optional(),
    pageToken: z.string().describe("Page token for pagination").optional(),
    labelIds: z.array(z.string()).describe("Filter by label IDs").optional(),
    format: z
      .enum(["full", "metadata", "minimal"])
      .describe(
        "The format of the message to return (default: metadata). Use 'metadata' for headers/subject/snippet, 'full' for complete email body (warning: can be very large)"
      )
      .optional(),
  })
  .strict();

export type search_and_retrieve_messagesInput = z.infer<
  typeof search_and_retrieve_messagesSchema
>;
