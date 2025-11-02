// Auto-generated schema for gmail.search_messages
// Generated on: 2025-11-01T09:49:26.900Z

import { z } from "zod";

export const search_messagesSchema = z
  .object({
    query: z.string().describe("Gmail search query (uses Gmail search syntax)"),
    maxResults: z
      .number()
      .describe("Maximum number of messages to return (default: 10)")
      .optional(),
    pageToken: z.string().describe("Page token for pagination").optional(),
    labelIds: z.array(z.string()).describe("Filter by label IDs").optional(),
  })
  .strict();

export type search_messagesInput = z.infer<typeof search_messagesSchema>;
