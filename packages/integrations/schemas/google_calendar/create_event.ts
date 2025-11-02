// Auto-generated schema for google_calendar.create_event
// Generated on: 2025-11-01T09:49:26.901Z

import { z } from "zod";

export const create_eventSchema = z
  .object({
    summary: z.string().describe("Event title"),
    description: z.string().describe("Event description").optional(),
    location: z.string().describe("Event location").optional(),
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
      .describe("Event start date/time"),
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
      .describe("Event end date/time"),
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
      .describe("List of attendees")
      .optional(),
    reminders: z
      .object({
        useDefault: z.boolean().describe("Use default reminders").optional(),
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
          .describe("Custom reminders")
          .optional(),
      })
      .strict()
      .optional(),
    calendarId: z
      .string()
      .describe('Calendar ID (default: "primary")')
      .optional(),
    colorId: z.string().describe("Event color ID (1-11)").optional(),
    timeZone: z.string().describe("Event time zone").optional(),
  })
  .strict();

export type create_eventInput = z.infer<typeof create_eventSchema>;
