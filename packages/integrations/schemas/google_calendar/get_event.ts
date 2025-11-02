// Auto-generated schema for google_calendar.get_event
// Generated on: 2025-11-01T09:49:26.902Z

import { z } from "zod";

export const get_eventSchema = z
  .object({
    eventId: z.string().describe("Event ID"),
    calendarId: z
      .string()
      .describe('Calendar ID (default: "primary")')
      .optional(),
  })
  .strict();

export type get_eventInput = z.infer<typeof get_eventSchema>;
