import { createCalendarClient } from "../calendarClient.ts";
import type {
  CalendarAuth,
  QuickAddEventParams,
  CalendarEvent,
} from "../calendarIntegration.ts";

export async function quickAddEvent(
  params: QuickAddEventParams,
  auth: CalendarAuth
): Promise<CalendarEvent> {
  const client = createCalendarClient(auth);
  const calendar = client.getCalendarApi();

  const response = await calendar.events.quickAdd({
    calendarId: params.calendarId || "primary",
    text: params.text,
  });

  return response.data as CalendarEvent;
}
