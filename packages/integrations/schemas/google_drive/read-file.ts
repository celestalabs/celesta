// Auto-generated schema for google_drive.read-file
// Generated on: 2025-11-01T09:49:26.905Z

import { z } from "zod";

export const read_fileSchema = z
  .object({
    fileId: z
      .string()
      .describe("File ID(SHORT_TEXT)*: File ID coming from | New File -> id |"),
    fileName: z
      .string()
      .describe("Destination File name(SHORT_TEXT)")
      .optional(),
  })
  .strict();

export type read_fileInput = z.infer<typeof read_fileSchema>;
