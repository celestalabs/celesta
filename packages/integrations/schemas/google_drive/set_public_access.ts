// Auto-generated schema for google_drive.set_public_access
// Generated on: 2025-11-01T09:49:26.906Z

import { z } from "zod";

export const set_public_accessSchema = z
  .object({
    fileId: z
      .string()
      .describe(
        "File or Folder ID(SHORT_TEXT)*: The ID of the file or folder to update permissions for"
      ),
  })
  .strict();

export type set_public_accessInput = z.infer<typeof set_public_accessSchema>;
