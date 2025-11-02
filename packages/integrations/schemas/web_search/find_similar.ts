// Auto-generated schema for web_search.find_similar
// Generated on: 2025-11-01T09:49:26.904Z

import { z } from "zod";

export const find_similarSchema = z
  .object({
    url: z.string().url().describe("The URL to find similar pages for"),
    numResults: z
      .number()
      .describe("Number of similar results to return")
      .optional(),
    excludeSourceDomain: z
      .boolean()
      .describe("Exclude results from the same domain as the source URL")
      .optional(),
    includeDomains: z
      .array(z.string())
      .describe("List of domains to include")
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
      .describe("Focus on specific content category")
      .optional(),
  })
  .strict();

export type find_similarInput = z.infer<typeof find_similarSchema>;
