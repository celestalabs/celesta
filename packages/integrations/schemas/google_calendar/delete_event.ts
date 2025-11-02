// Auto-generated schema for google_calendar.delete_event
// Generated on: 2025-11-01T09:49:26.902Z

import { z } from "zod";

export const delete_eventSchema = z
  .object({
    eventId: z.string().describe("Event ID to delete"),
    calendarId: z
      .string()
      .describe('Calendar ID (default: "primary")')
      .optional(),
    sendUpdates: z
      .enum(["all", "externalOnly", "none"])
      .describe("Send cancellation notifications")
      .optional(),
  })
  .strict();

export type delete_eventInput = z.infer<typeof delete_eventSchema>;
