// Auto-generated schema for google_drive.search-folder
// Generated on: 2025-11-01T09:49:26.905Z

import { z } from "zod";

export const search_folderSchema = z
  .object({
    queryTerm: z
      .enum(["name", "fullText", "mimeType"])
      .describe(
        "Query Term(STATIC_DROPDOWN)*: The Query term or field of file/folder to search upon."
      ),
    operator: z
      .enum(["contains", "="])
      .describe("Operator(STATIC_DROPDOWN)*: The operator to create criteria."),
    query: z
      .string()
      .describe(
        "Value(SHORT_TEXT)*: Value of the field of file/folder to search for."
      ),
    type: z
      .enum(["all", "file", "folder"])
      .describe(
        "File Type(STATIC_DROPDOWN): (Optional) Choose between files and folders."
      )
      .optional(),
    parentFolder: z.any().describe("Parent Folder(DROPDOWN)").optional(),
    include_team_drives: z
      .boolean()
      .describe(
        "Include Team Drives(CHECKBOX): Determines if folders from Team Drives should be included in the results."
      )
      .optional(),
  })
  .strict();

export type search_folderInput = z.infer<typeof search_folderSchema>;
