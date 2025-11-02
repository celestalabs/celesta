// Auto-generated schema for google_drive.update_permissions
// Generated on: 2025-11-01T09:49:26.905Z

import { z } from "zod";

export const update_permissionsSchema = z
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
      .describe(
        "Role(STATIC_DROPDOWN)*: The role to grant to user. See more at: https://developers.google.com/drive/api/guides/ref-roles"
      ),
    include_team_drives: z
      .boolean()
      .describe(
        "Include Team Drives(CHECKBOX): Determines if folders from Team Drives should be included in the results."
      )
      .optional(),
    send_invitation_email: z
      .boolean()
      .describe(
        "Send invitation email(CHECKBOX)*: Send an email to the user to notify them of the new permissions"
      ),
  })
  .strict();

export type update_permissionsInput = z.infer<typeof update_permissionsSchema>;
