// Auto-generated schema for web_search.answer_question
// Generated on: 2025-11-01T09:49:26.904Z

import { z } from "zod";

export const answer_questionSchema = z
  .object({
    query: z.string().describe("The question to answer"),
    includeText: z
      .boolean()
      .describe("Include full text of citation sources")
      .optional(),
  })
  .strict();

export type answer_questionInput = z.infer<typeof answer_questionSchema>;
