import { CalendarClient, createCalendarClient } from '../calendarClient.ts';
import type { CalendarAuth, ListEventsParams, CalendarEventList, CalendarEvent } from '../calendarIntegration.ts';

export async function listEvents(
  params: ListEventsParams,
  auth: CalendarAuth
): Promise<CalendarEventList> {
  const client = createCalendarClient(auth);
  const calendar = client.getCalendarApi();

  const response = await calendar.events.list({
    calendarId: params.calendarId || 'primary',
    ...(params.timeMin && { timeMin: params.timeMin }),
    ...(params.timeMax && { timeMax: params.timeMax }),
    maxResults: params.maxResults || 10,
    ...(params.pageToken && { pageToken: params.pageToken }),
    ...(params.q && { q: params.q }),
    singleEvents: params.singleEvents ?? true,
    ...(params.orderBy && { orderBy: params.orderBy }),
  });

  return {
    items: (response.data.items || []) as CalendarEvent[],
    nextPageToken: response.data.nextPageToken ?? undefined,
    summary: response.data.summary || 'Calendar',
    timeZone: response.data.timeZone || 'UTC',
  };
}
