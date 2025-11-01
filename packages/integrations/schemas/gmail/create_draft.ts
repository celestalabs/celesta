// Auto-generated schema for gmail.create_draft
// Generated on: 2025-11-01T09:49:26.901Z

import { z } from "zod";

export const create_draftSchema = z
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
  })
  .strict();

export type create_draftInput = z.infer<typeof create_draftSchema>;
