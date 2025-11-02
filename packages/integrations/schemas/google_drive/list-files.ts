// Auto-generated schema for google_drive.list-files
// Generated on: 2025-11-01T09:49:26.905Z

import { z } from "zod";

export const list_filesSchema = z
  .object({
    folderId: z
      .string()
      .describe(
        "Folder ID(SHORT_TEXT)*: Folder ID coming from | New Folder -> id | (or any other source)"
      ),
    include_team_drives: z
      .boolean()
      .describe(
        "Include Team Drives(CHECKBOX): Determines if folders from Team Drives should be included in the results."
      )
      .optional(),
    includeTrashed: z
      .boolean()
      .describe(
        "Include Trashed(CHECKBOX): Include new files that have been trashed."
      )
      .optional(),
    depthLevel: z
      .number()
      .describe(
        "Depth Level(NUMBER): How many levels deep to search for files. 1 = current folder only, 2 = current + next level, etc."
      )
      .optional(),
    downloadFiles: z
      .boolean()
      .describe(
        "Download Files(CHECKBOX): Download all file contents in a list"
      )
      .optional(),
  })
  .strict();

export type list_filesInput = z.infer<typeof list_filesSchema>;
