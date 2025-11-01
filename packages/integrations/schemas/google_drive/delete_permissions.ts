// Auto-generated schema for google_drive.delete_permissions
// Generated on: 2025-11-01T09:49:26.906Z

import { z } from "zod";

export const delete_permissionsSchema = z
  .object({
    fileId: z
      .string()
      .describe(
        "File or Folder ID(SHORT_TEXT)*: The ID of the file or folder to update permissions for"
      ),
    user_email: z
      .string()
      .describe(
        "User email(SHORT_TEXT)*: The email address of the user to update permissions for"
      ),
    permission_name: z
      .enum(["organizer", "fileOrganizer", "writer", "commenter", "reader"])
      .describe("Role(STATIC_DROPDOWN)*: The role to remove from user."),
  })
  .strict();

export type delete_permissionsInput = z.infer<typeof delete_permissionsSchema>;
