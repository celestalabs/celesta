import { CalendarClient, createCalendarClient } from "../calendarClient.ts";
import type {
  CalendarAuth,
  UpdateEventParams,
  CalendarEvent,
} from "../calendarIntegration.ts";

export async function updateEvent(
  params: UpdateEventParams,
  auth: CalendarAuth
): Promise<CalendarEvent> {
  const client = createCalendarClient(auth);
  const calendar = client.getCalendarApi();

  const response = await calendar.events.patch(
    {
      calendarId: params.calendarId || "primary",
      eventId: params.eventId,
      requestBody: {
        summary: params.summary ?? null,
        description: params.description ?? null,
        location: params.location ?? null,
        start: params.start ?? {
          dateTime: null,
          date: null,
          timeZone: null,
        },
        end: params.end ?? {
          dateTime: null,
          date: null,
          timeZone: null,
        },
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
