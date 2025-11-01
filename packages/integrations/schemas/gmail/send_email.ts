// Auto-generated schema for gmail.send_email
// Generated on: 2025-11-01T09:49:26.900Z

import { z } from "zod";

export const send_emailSchema = z
  .object({
    to: z
      .union([z.string(), z.array(z.string())])
      .describe("Recipient email address(es)"),
    subject: z.string().describe("Email subject"),
    body: z.string().describe("Email body content"),
    isHtml: z
      .boolean()
      .describe("Whether the body is HTML formatted")
      .optional(),
    cc: z
      .union([z.string(), z.array(z.string())])
      .describe("CC recipient email address(es)")
      .optional(),
    bcc: z
      .union([z.string(), z.array(z.string())])
      .describe("BCC recipient email address(es)")
      .optional(),
    from: z
      .string()
      .describe("Sender email address (defaults to authenticated user)")
      .optional(),
  })
  .strict();

export type send_emailInput = z.infer<typeof send_emailSchema>;
