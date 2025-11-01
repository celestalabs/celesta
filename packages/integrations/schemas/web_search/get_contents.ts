// Auto-generated schema for web_search.get_contents
// Generated on: 2025-11-01T09:49:26.904Z

import { z } from "zod";

export const get_contentsSchema = z
  .object({
    urls: z
      .array(z.string().url())
      .describe("Array of URLs to extract content from"),
    text: z
      .union([
        z.boolean(),
        z
          .object({
            maxCharacters: z
              .number()
              .describe("Maximum characters to return from page content")
              .optional(),
            includeHtmlTags: z
              .boolean()
              .describe("Include HTML tags in content")
              .optional(),
          })
          .strict(),
      ])
      .describe("Include full text content (default: true)")
      .optional(),
    highlights: z
      .union([
        z.boolean(),
        z
          .object({
            query: z
              .string()
              .describe("Custom query for generating highlights")
              .optional(),
            numSentences: z
              .number()
              .describe("Number of sentences per highlight")
              .optional(),
            highlightsPerUrl: z
              .number()
              .describe("Number of highlights per page")
              .optional(),
          })
          .strict(),
      ])
      .describe("Include highlighted excerpts from pages")
      .optional(),
  })
  .strict();

export type get_contentsInput = z.infer<typeof get_contentsSchema>;
