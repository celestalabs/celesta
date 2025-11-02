// Auto-generated schema for google_drive.create_new_gdrive_folder
// Generated on: 2025-11-01T09:49:26.904Z

import { z } from "zod";

export const create_new_gdrive_folderSchema = z
  .object({
    folderName: z
      .string()
      .describe("Folder name(SHORT_TEXT)*: The name of the new folder"),
    parentFolder: z.any().describe("Parent Folder(DROPDOWN)").optional(),
    include_team_drives: z
      .boolean()
      .describe(
        "Include Team Drives(CHECKBOX): Determines if folders from Team Drives should be included in the results."
      )
      .optional(),
  })
  .strict();

export type create_new_gdrive_folderInput = z.infer<
  typeof create_new_gdrive_folderSchema
>;
