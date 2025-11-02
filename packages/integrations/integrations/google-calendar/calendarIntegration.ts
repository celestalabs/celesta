import z from "zod";
import type { IntegrationMetadata } from "../integrationMetadata.ts";
import { createEvent } from "./actions/createEvent.ts";
import { deleteEvent } from "./actions/deleteEvent.ts";
import { getEvent } from "./actions/getEvent.ts";
import { listEvents } from "./actions/listEvents.ts";
import { quickAddEvent } from "./actions/quickAddEvent.ts";
import { updateEvent } from "./actions/updateEvent.ts";

// ============================================================================
// TYPE DEFINITIONS (Manual - for response types that don't have Zod schemas)
// ============================================================================

export interface CalendarAuth {
  access_token: string;
}

export interface EventAttendee {
  email: string;
  displayName?: string;
  optional?: boolean;
  responseStatus?: "needsAction" | "declined" | "tentative" | "accepted";
}

export interface EventDateTime {
  dateTime?: string; // RFC3339 timestamp
  date?: string; // Date only (all-day events)
  timeZone?: string;
}

export interface EventReminder {
  method: "email" | "popup";
  minutes: number;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: EventDateTime;
  end: EventDateTime;
  attendees?: EventAttendee[];
  creator?: {
    email: string;
    displayName?: string;
  };
  organizer?: {
    email: string;
    displayName?: string;
  };
  status?: "confirmed" | "tentative" | "cancelled";
  htmlLink?: string;
  created?: string;
  updated?: string;
  colorId?: string;
  reminders?: {
    useDefault: boolean;
    overrides?: EventReminder[];
  };
}

export interface CalendarEventList {
  items: CalendarEvent[];
  nextPageToken?: string | undefined;
  summary: string;
  timeZone: string;
}

// Define Zod schemas for each action's input
const eventDateTimeSchema = z.object({
  dateTime: z
    .string()
    .nullable()
    .describe('RFC3339 timestamp (e.g., "2024-01-15T10:00:00-07:00")'),
  date: z
    .string()
    .nullable()
    .describe('Date only for all-day events (e.g., "2024-01-15")'),
  timeZone: z
    .string()
    .nullable()
    .describe('Time zone (e.g., "America/Los_Angeles")'),
});

const eventAttendeeSchema = z.object({
  email: z.string().describe("Attendee email address"),
  displayName: z.string().nullable().describe("Attendee display name"),
  optional: z.boolean().nullable().describe("Whether attendance is optional"),
  responseStatus: z
    .enum(["needsAction", "declined", "tentative", "accepted"])
    .nullable(),
});

const eventReminderSchema = z.object({
  method: z.enum(["email", "popup"]).describe("Reminder method"),
  minutes: z.number().describe("Minutes before event to trigger reminder"),
});

const createEventSchema = z.object({
  summary: z.string().describe("Event title"),
  description: z.string().optional().describe("Event description"),
  location: z.string().optional().describe("Event location"),
  start: eventDateTimeSchema.describe("Event start date/time"),
  end: eventDateTimeSchema.describe("Event end date/time"),
  attendees: z
    .array(eventAttendeeSchema)
    .optional()
    .describe("List of attendees"),
  reminders: z
    .object({
      useDefault: z.boolean().optional().describe("Use default reminders"),
      overrides: z
        .array(eventReminderSchema)
        .optional()
        .describe("Custom reminders"),
    })
    .optional(),
  calendarId: z
    .string()
    .optional()
    .describe('Calendar ID (default: "primary")'),
  colorId: z.string().optional().describe("Event color ID (1-11)"),
  timeZone: z.string().optional().describe("Event time zone"),
});

const listEventsSchema = z.object({
  calendarId: z
    .string()
    .optional()
    .describe('Calendar ID (default: "primary")'),
  timeMin: z
    .string()
    .optional()
    .describe("Lower bound for event start time (RFC3339)"),
  timeMax: z
    .string()
    .optional()
    .describe("Upper bound for event start time (RFC3339)"),
  maxResults: z
    .number()
    .optional()
    .describe("Maximum number of events (default: 10)"),
  pageToken: z.string().optional().describe("Page token for pagination"),
  q: z.string().optional().describe("Free text search query"),
  singleEvents: z
    .boolean()
    .optional()
    .describe("Expand recurring events (default: true)"),
  orderBy: z
    .enum(["startTime", "updated"])
    .optional()
    .describe("Order results by field"),
});

const getEventSchema = z.object({
  eventId: z.string().describe("Event ID"),
  calendarId: z
    .string()
    .optional()
    .describe('Calendar ID (default: "primary")'),
});

const updateEventSchema = z.object({
  eventId: z.string().describe("Event ID to update"),
  calendarId: z
    .string()
    .optional()
    .describe('Calendar ID (default: "primary")'),
  summary: z.string().optional().describe("New event title"),
  description: z.string().optional().describe("New event description"),
  location: z.string().optional().describe("New event location"),
  start: eventDateTimeSchema.optional().describe("New event start date/time"),
  end: eventDateTimeSchema.optional().describe("New event end date/time"),
  attendees: z
    .array(eventAttendeeSchema)
    .optional()
    .describe("New list of attendees"),
  reminders: z
    .object({
      useDefault: z.boolean().optional(),
      overrides: z.array(eventReminderSchema).optional(),
    })
    .optional(),
  colorId: z.string().optional().describe("New event color ID"),
});

const deleteEventSchema = z.object({
  eventId: z.string().describe("Event ID to delete"),
  calendarId: z
    .string()
    .optional()
    .describe('Calendar ID (default: "primary")'),
  sendUpdates: z
    .enum(["all", "externalOnly", "none"])
    .optional()
    .describe("Send cancellation notifications"),
});

const quickAddEventSchema = z.object({
  text: z
    .string()
    .describe(
      'Natural language event description (e.g., "Dinner with John tomorrow at 7pm")'
    ),
  calendarId: z
    .string()
    .optional()
    .describe('Calendar ID (default: "primary")'),
});

// ============================================================================
// INFERRED TYPES (from Zod schemas - single source of truth for params)
// ============================================================================

export type CreateEventParams = z.infer<typeof createEventSchema>;
export type ListEventsParams = z.infer<typeof listEventsSchema>;
export type GetEventParams = z.infer<typeof getEventSchema>;
export type UpdateEventParams = z.infer<typeof updateEventSchema>;
export type DeleteEventParams = z.infer<typeof deleteEventSchema>;
export type QuickAddEventParams = z.infer<typeof quickAddEventSchema>;

// Define the Google Calendar integration
export const calendarIntegration: IntegrationMetadata = {
  name: "Google Calendar",
  description: "Manage calendar events and schedules",
  logoUrl: "https://www.google.com/calendar/about/images/calendar-icon.png",
  requiresUserAuth: true,
  actions: [
    {
      name: "create_event",
      description: "Create a new calendar event",
      props: createEventSchema,
      mode: ["chat", "workflow"],
    },
    {
      name: "list_events",
      description: "List calendar events with optional filtering",
      props: listEventsSchema,
      mode: ["chat", "workflow"],
    },
    {
      name: "get_event",
      description: "Get details of a specific calendar event",
      props: getEventSchema,
      mode: ["chat", "workflow"],
    },
    {
      name: "update_event",
      description: "Update an existing calendar event",
      props: updateEventSchema,
      mode: ["workflow"], // Write operation - workflow only
    },
    {
      name: "delete_event",
      description: "Delete a calendar event",
      props: deleteEventSchema,
      mode: ["workflow"], // Write operation - workflow only
    },
    {
      name: "quick_add_event",
      description:
        'Create an event using natural language (e.g., "Lunch tomorrow at noon")',
      props: quickAddEventSchema,
      mode: ["chat", "workflow"], // Write operation - workflow only
    },
  ],
} as const satisfies IntegrationMetadata;

// Export action executors
export const calendarActions = {
  create_event: createEvent,
  list_events: listEvents,
  get_event: getEvent,
  update_event: updateEvent,
  delete_event: deleteEvent,
  quick_add_event: quickAddEvent,
} as const;

// Type-safe action executor
export async function executeCalendarAction(
  actionName: string,
  props: object,
  auth: CalendarAuth
): Promise<any> {
  const action = calendarActions[actionName as keyof typeof calendarActions];
  if (!action) {
    throw new Error(`Unknown Calendar action: ${actionName}`);
  }
  // Note: Each action has its own specific params type. We use 'as any' here because
  // TypeScript can't verify at compile time that the props match the selected action.
  // Runtime validation happens within each action function.
  return action(props as any, auth);
}
