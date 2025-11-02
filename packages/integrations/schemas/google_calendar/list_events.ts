// Auto-generated schema for google_calendar.list_events
// Generated on: 2025-11-01T09:49:26.901Z

import { z } from "zod";

export const list_eventsSchema = z
  .object({
    calendarId: z
      .string()
      .describe('Calendar ID (default: "primary")')
      .optional(),
    timeMin: z
      .string()
      .describe("Lower bound for event start time (RFC3339)")
      .optional(),
    timeMax: z
      .string()
      .describe("Upper bound for event start time (RFC3339)")
      .optional(),
    maxResults: z
      .number()
      .describe("Maximum number of events (default: 10)")
      .optional(),
    pageToken: z.string().describe("Page token for pagination").optional(),
    q: z.string().describe("Free text search query").optional(),
    singleEvents: z
      .boolean()
      .describe("Expand recurring events (default: true)")
      .optional(),
    orderBy: z
      .enum(["startTime", "updated"])
      .describe("Order results by field")
      .optional(),
  })
  .strict();

export type list_eventsInput = z.infer<typeof list_eventsSchema>;
