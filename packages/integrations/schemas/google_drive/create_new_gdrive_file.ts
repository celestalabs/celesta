// Auto-generated schema for google_drive.create_new_gdrive_file
// Generated on: 2025-11-01T09:49:26.904Z

import { z } from "zod";

export const create_new_gdrive_fileSchema = z
  .object({
    fileName: z
      .string()
      .describe("File name(SHORT_TEXT)*: The name of the new text file"),
    text: z
      .string()
      .describe("Text(LONG_TEXT)*: The text content to add to file"),
    fileType: z
      .enum(["plain/text", "text/csv", "text/xml"])
      .describe("Content type(STATIC_DROPDOWN)*: Select file type"),
    parentFolder: z.any().describe("Parent Folder(DROPDOWN)").optional(),
    include_team_drives: z
      .boolean()
      .describe(
        "Include Team Drives(CHECKBOX): Determines if folders from Team Drives should be included in the results."
      )
      .optional(),
  })
  .strict();

export type create_new_gdrive_fileInput = z.infer<
  typeof create_new_gdrive_fileSchema
>;
