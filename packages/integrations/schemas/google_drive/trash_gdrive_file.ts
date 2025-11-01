// Auto-generated schema for google_drive.trash_gdrive_file
// Generated on: 2025-11-01T09:49:26.907Z

import { z } from "zod";

export const trash_gdrive_fileSchema = z
  .object({
    fileId: z
      .string()
      .describe("File ID(SHORT_TEXT)*: The ID of the file to trash"),
    include_team_drives: z
      .boolean()
      .describe(
        "Include Team Drives(CHECKBOX): Determines if folders from Team Drives should be included in the results."
      )
      .optional(),
  })
  .strict();

export type trash_gdrive_fileInput = z.infer<typeof trash_gdrive_fileSchema>;
