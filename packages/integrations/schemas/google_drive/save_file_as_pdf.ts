// Auto-generated schema for google_drive.save_file_as_pdf
// Generated on: 2025-11-01T09:49:26.905Z

import { z } from "zod";

export const save_file_as_pdfSchema = z
  .object({
    documentId: z
      .string()
      .describe("Document ID(SHORT_TEXT)*: The ID of the document to export"),
    folderId: z
      .string()
      .describe(
        "Folder ID(SHORT_TEXT)*: The ID of the folder where the file will be exported"
      ),
    name: z
      .string()
      .describe(
        "Name(SHORT_TEXT)*: The name of the new file (do not include the extension)"
      ),
    include_team_drives: z
      .boolean()
      .describe(
        "Include Team Drives(CHECKBOX): Determines if folders from Team Drives should be included in the results."
      )
      .optional(),
  })
  .strict();

export type save_file_as_pdfInput = z.infer<typeof save_file_as_pdfSchema>;
