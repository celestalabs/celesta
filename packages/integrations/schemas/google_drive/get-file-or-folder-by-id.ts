// Auto-generated schema for google_drive.get-file-or-folder-by-id
// Generated on: 2025-11-01T09:49:26.905Z

import { z } from "zod";

export const get_file_or_folder_by_idSchema = z
  .object({
    id: z
      .string()
      .describe(
        "File / Folder Id(SHORT_TEXT)*: The Id of the file/folder to search for."
      ),
    include_team_drives: z
      .boolean()
      .describe(
        "Include Team Drives(CHECKBOX): Determines if folders from Team Drives should be included in the results."
      )
      .optional(),
  })
  .strict();

export type get_file_or_folder_by_idInput = z.infer<
  typeof get_file_or_folder_by_idSchema
>;
