// Auto-generated schema for google_drive.upload_gdrive_file
// Generated on: 2025-11-01T09:49:26.905Z

import { z } from "zod";

export const upload_gdrive_fileSchema = z
  .object({
    fileName: z
      .string()
      .describe("File name(SHORT_TEXT)*: The name of the file"),
    file: z.any().describe("File(FILE)*: The file URL or base64 to upload"),
    parentFolder: z.any().describe("Parent Folder(DROPDOWN)").optional(),
    include_team_drives: z
      .boolean()
      .describe(
        "Include Team Drives(CHECKBOX): Determines if folders from Team Drives should be included in the results."
      )
      .optional(),
  })
  .strict();

export type upload_gdrive_fileInput = z.infer<typeof upload_gdrive_fileSchema>;
