import { createCalendarClient } from "../calendarClient.ts";
import type {
  CalendarAuth,
  CreateEventParams,
  CalendarEvent,
} from "../calendarIntegration.ts";

export async function createEvent(
  params: CreateEventParams,
  auth: CalendarAuth
): Promise<CalendarEvent> {
  const client = createCalendarClient(auth);
  const calendar = client.getCalendarApi();

  const response = await calendar.events.insert(
    {
      calendarId: params.calendarId || "primary",
      requestBody: {
        summary: params.summary,
        description: params.description ?? null,
        location: params.location ?? null,
        start: params.start,
        end: params.end,
        attendees:
          params.attendees?.map((a) => ({
            email: a.email,
            displayName: a.displayName ?? null,
            optional: a.optional ?? null,
            responseStatus: a.responseStatus ?? null,
          })) ?? [],
        reminders: {
          useDefault: params.reminders?.useDefault ?? true,
          overrides: params.reminders?.overrides ?? [],
        },
        colorId: params.colorId ?? null,
      },
    },
    undefined
  );

  return response.data as CalendarEvent;
}
