// Auto-generated schema for google_calendar.quick_add_event
// Generated on: 2025-11-01T09:49:26.902Z

import { z } from "zod";

export const quick_add_eventSchema = z
  .object({
    text: z
      .string()
      .describe(
        'Natural language event description (e.g., "Dinner with John tomorrow at 7pm")'
      ),
    calendarId: z
      .string()
      .describe('Calendar ID (default: "primary")')
      .optional(),
  })
  .strict();

export type quick_add_eventInput = z.infer<typeof quick_add_eventSchema>;
