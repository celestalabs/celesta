import { createCalendarClient } from '../calendarClient.ts';
import type { CalendarAuth, CreateEventParams, CalendarEvent } from '../types.ts';

export async function createEvent(
  params: CreateEventParams,
  auth: CalendarAuth
): Promise<CalendarEvent> {
  const client = createCalendarClient(auth);
  const calendar = client.getCalendarApi();

  const response = await calendar.events.insert({
    calendarId: params.calendarId || 'primary',
    requestBody: {
      summary: params.summary,
      ...(params.description && { description: params.description }),
      ...(params.location && { location: params.location }),
      start: params.start,
      end: params.end,
      ...(params.attendees && { attendees: params.attendees }),
      ...(params.reminders && { reminders: params.reminders }),
      ...(params.colorId && { colorId: params.colorId }),
    },
  });

  return response.data as CalendarEvent;
}
