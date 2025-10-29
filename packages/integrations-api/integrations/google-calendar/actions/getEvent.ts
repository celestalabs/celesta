import { createCalendarClient } from "../calendarClient.ts";
import type {
  CalendarAuth,
  GetEventParams,
  CalendarEvent,
} from "../calendarIntegration.ts";

export async function getEvent(
  params: GetEventParams,
  auth: CalendarAuth
): Promise<CalendarEvent> {
  const client = createCalendarClient(auth);
  const calendar = client.getCalendarApi();

  const response = await calendar.events.get({
    calendarId: params.calendarId || "primary",
    eventId: params.eventId,
  });

  return response.data as CalendarEvent;
}
