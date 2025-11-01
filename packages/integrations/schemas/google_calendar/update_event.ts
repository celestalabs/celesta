// Auto-generated schema for google_calendar.update_event
// Generated on: 2025-11-01T09:49:26.902Z

import { z } from "zod";

export const update_eventSchema = z
  .object({
    eventId: z.string().describe("Event ID to update"),
    calendarId: z
      .string()
      .describe('Calendar ID (default: "primary")')
      .optional(),
    summary: z.string().describe("New event title").optional(),
    description: z.string().describe("New event description").optional(),
    location: z.string().describe("New event location").optional(),
    start: z
      .object({
        dateTime: z
          .union([z.string(), z.null()])
          .describe('RFC3339 timestamp (e.g., "2024-01-15T10:00:00-07:00")'),
        date: z
          .union([z.string(), z.null()])
          .describe('Date only for all-day events (e.g., "2024-01-15")'),
        timeZone: z
          .union([z.string(), z.null()])
          .describe('Time zone (e.g., "America/Los_Angeles")'),
      })
      .strict()
      .describe("New event start date/time")
      .optional(),
    end: z
      .object({
        dateTime: z
          .union([z.string(), z.null()])
          .describe('RFC3339 timestamp (e.g., "2024-01-15T10:00:00-07:00")'),
        date: z
          .union([z.string(), z.null()])
          .describe('Date only for all-day events (e.g., "2024-01-15")'),
        timeZone: z
          .union([z.string(), z.null()])
          .describe('Time zone (e.g., "America/Los_Angeles")'),
      })
      .strict()
      .describe("New event end date/time")
      .optional(),
    attendees: z
      .array(
        z
          .object({
            email: z.string().describe("Attendee email address"),
            displayName: z
              .union([z.string(), z.null()])
              .describe("Attendee display name"),
            optional: z
              .union([z.boolean(), z.null()])
              .describe("Whether attendance is optional"),
            responseStatus: z.union([
              z.enum(["needsAction", "declined", "tentative", "accepted"]),
              z.null(),
            ]),
          })
          .strict()
      )
      .describe("New list of attendees")
      .optional(),
    reminders: z
      .object({
        useDefault: z.boolean().optional(),
        overrides: z
          .array(
            z
              .object({
                method: z.enum(["email", "popup"]).describe("Reminder method"),
                minutes: z
                  .number()
                  .describe("Minutes before event to trigger reminder"),
              })
              .strict()
          )
          .optional(),
      })
      .strict()
      .optional(),
    colorId: z.string().describe("New event color ID").optional(),
  })
  .strict();

export type update_eventInput = z.infer<typeof update_eventSchema>;
