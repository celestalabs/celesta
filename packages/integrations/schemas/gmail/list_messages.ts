// Auto-generated schema for gmail.list_messages
// Generated on: 2025-11-01T09:49:26.900Z

import { z } from "zod";

export const list_messagesSchema = z
  .object({
    maxResults: z
      .number()
      .describe("Maximum number of messages to return (default: 10)")
      .optional(),
    pageToken: z.string().describe("Page token for pagination").optional(),
    labelIds: z.array(z.string()).describe("Filter by label IDs").optional(),
    includeSpamTrash: z
      .boolean()
      .describe("Include messages from SPAM and TRASH (default: false)")
      .optional(),
  })
  .strict();

export type list_messagesInput = z.infer<typeof list_messagesSchema>;
