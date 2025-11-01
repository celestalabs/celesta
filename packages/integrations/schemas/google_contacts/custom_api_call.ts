// Auto-generated schema for google_contacts.custom_api_call
// Generated on: 2025-11-01T09:49:26.909Z

import { z } from "zod";

export const custom_api_callSchema = z
  .object({
    url: z.any().describe("(DYNAMIC)*"),
    method: z
      .enum(["GET", "POST", "PATCH", "PUT", "DELETE", "HEAD"])
      .describe("Method(STATIC_DROPDOWN)*"),
    headers: z
      .record(z.any())
      .describe(
        "Headers(OBJECT)*: Authorization headers are injected automatically from your connection."
      ),
    queryParams: z.record(z.any()).describe("Query Parameters(OBJECT)*"),
    body: z.any().describe("Body(JSON)").optional(),
    response_is_binary: z
      .boolean()
      .describe(
        "Response is Binary ?(CHECKBOX): Enable for files like PDFs, images, etc.."
      )
      .optional(),
    failsafe: z.boolean().describe("No Error on Failure(CHECKBOX)").optional(),
    timeout: z.number().describe("Timeout (in seconds)(NUMBER)").optional(),
  })
  .strict();

export type custom_api_callInput = z.infer<typeof custom_api_callSchema>;
