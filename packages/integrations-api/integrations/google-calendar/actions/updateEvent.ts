import { createCalendarClient } from '../calendarClient.ts';
import type { CalendarAuth, UpdateEventParams, CalendarEvent } from '../types.ts';

export async function updateEvent(
  params: UpdateEventParams,
  auth: CalendarAuth
): Promise<CalendarEvent> {
  const client = createCalendarClient(auth);
  const calendar = client.getCalendarApi();

  const response = await calendar.events.patch({
    calendarId: params.calendarId || 'primary',
    eventId: params.eventId,
    requestBody: {
      ...(params.summary && { summary: params.summary }),
      ...(params.description !== undefined && { description: params.description }),
      ...(params.location !== undefined && { location: params.location }),
      ...(params.start && { start: params.start }),
      ...(params.end && { end: params.end }),
      ...(params.attendees && { attendees: params.attendees }),
      ...(params.reminders && { reminders: params.reminders }),
      ...(params.colorId && { colorId: params.colorId }),
    },
  });

  return response.data as CalendarEvent;
}
