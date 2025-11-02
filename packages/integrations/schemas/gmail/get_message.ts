// Auto-generated schema for gmail.get_message
// Generated on: 2025-11-01T09:49:26.900Z

import { z } from "zod";

export const get_messageSchema = z
  .object({
    messageId: z.string().describe("The ID of the message to retrieve"),
    format: z
      .enum(["full", "metadata", "minimal", "raw"])
      .describe("The format of the message to return (default: full)")
      .optional(),
  })
  .strict();

export type get_messageInput = z.infer<typeof get_messageSchema>;
