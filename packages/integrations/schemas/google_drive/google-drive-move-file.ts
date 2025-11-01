// Auto-generated schema for google_drive.google-drive-move-file
// Generated on: 2025-11-01T09:49:26.906Z

import { z } from "zod";

export const google_drive_move_fileSchema = z
  .object({
    fileId: z
      .string()
      .describe(
        "File ID(SHORT_TEXT)*: You can use **Search Folder/File** action to retrieve ID."
      ),
    include_team_drives: z
      .boolean()
      .describe(
        "Include Team Drives(CHECKBOX): Determines if folders from Team Drives should be included in the results."
      )
      .optional(),
    folderId: z.any().describe("Parent Folder(DROPDOWN)").optional(),
  })
  .strict();

export type google_drive_move_fileInput = z.infer<
  typeof google_drive_move_fileSchema
>;
