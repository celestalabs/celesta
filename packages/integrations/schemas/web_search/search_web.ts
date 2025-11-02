// Auto-generated schema for web_search.search_web
// Generated on: 2025-11-01T09:49:26.903Z

import { z } from "zod";

export const search_webSchema = z
  .object({
    query: z.string().describe("The search query"),
    numResults: z
      .number()
      .describe("Number of results to return (max 100)")
      .optional(),
    type: z
      .enum(["auto", "neural", "keyword"])
      .describe(
        "Search type: auto (default), neural (semantic), or keyword (traditional)"
      )
      .optional(),
    category: z
      .enum([
        "company",
        "research paper",
        "news",
        "linkedin profile",
        "github",
        "tweet",
        "movie",
        "song",
        "personal site",
        "pdf",
        "financial report",
      ])
      .describe("Focus search on specific content category")
      .optional(),
    includeDomains: z
      .array(z.string())
      .describe('List of domains to include (e.g., ["nytimes.com", "wsj.com"])')
      .optional(),
    excludeDomains: z
      .array(z.string())
      .describe("List of domains to exclude")
      .optional(),
    startPublishedDate: z
      .string()
      .describe(
        "Filter results published after this date (ISO format: YYYY-MM-DD)"
      )
      .optional(),
    endPublishedDate: z
      .string()
      .describe(
        "Filter results published before this date (ISO format: YYYY-MM-DD)"
      )
      .optional(),
    includeText: z
      .array(z.string())
      .describe(
        "List of strings that must be present in webpage text (currently supports 1 string of up to 5 words)"
      )
      .optional(),
    excludeText: z
      .array(z.string())
      .describe(
        "List of strings that must not be present in webpage text (currently supports 1 string of up to 5 words)"
      )
      .optional(),
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
      .describe("Include full text content from pages")
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

export type search_webInput = z.infer<typeof search_webSchema>;
