// Auto-generated schema for google_drive.delete_gdrive_file
// Generated on: 2025-11-01T09:49:26.906Z

import { z } from "zod";

export const delete_gdrive_fileSchema = z
  .object({
    fileId: z
      .string()
      .describe("File ID(SHORT_TEXT)*: The ID of the file to delete"),
    include_team_drives: z
      .boolean()
      .describe(
        "Include Team Drives(CHECKBOX): Determines if folders from Team Drives should be included in the results."
      )
      .optional(),
  })
  .strict();

export type delete_gdrive_fileInput = z.infer<typeof delete_gdrive_fileSchema>;
