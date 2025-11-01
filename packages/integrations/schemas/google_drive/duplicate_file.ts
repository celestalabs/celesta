// Auto-generated schema for google_drive.duplicate_file
// Generated on: 2025-11-01T09:49:26.905Z

import { z } from "zod";

export const duplicate_fileSchema = z
  .object({
    fileId: z
      .string()
      .describe("File ID(SHORT_TEXT)*: The ID of the file to duplicate"),
    name: z.string().describe("Name(SHORT_TEXT)*: The name of the new file"),
    folderId: z
      .string()
      .describe(
        "Folder ID(SHORT_TEXT)*: The ID of the folder where the file will be duplicated"
      ),
    mimeType: z
      .enum([
        "application/vnd.google-apps.spreadsheet",
        "application/vnd.google-apps.document",
      ])
      .describe(
        "Duplicate as(STATIC_DROPDOWN): If left unselected the file will be duplicated as it is"
      )
      .optional(),
    include_team_drives: z
      .boolean()
      .describe(
        "Include Team Drives(CHECKBOX): Determines if folders from Team Drives should be included in the results."
      )
      .optional(),
  })
  .strict();

export type duplicate_fileInput = z.infer<typeof duplicate_fileSchema>;
