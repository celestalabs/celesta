// Auto-generated schema for browser_context.get_page_content
// Generated on: 2025-11-01T09:49:26.897Z

import { z } from "zod";

export const get_page_contentSchema = z
  .object({
    titleOfOpenTab: z
      .string()
      .describe(
        "The EXACT title of the tab as returned by list_open_tabs. Must be an exact string match - do not use generic terms like 'current' or 'active'."
      ),
  })
  .strict();

export type get_page_contentInput = z.infer<typeof get_page_contentSchema>;
