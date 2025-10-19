import { createCalendarClient } from '../calendarClient.ts';
import type { CalendarAuth, DeleteEventParams } from '../calendarIntegration.ts';

export async function deleteEvent(
  params: DeleteEventParams,
  auth: CalendarAuth
): Promise<{ success: boolean }> {
  const client = createCalendarClient(auth);
  const calendar = client.getCalendarApi();

  await calendar.events.delete({
    calendarId: params.calendarId || 'primary',
    eventId: params.eventId,
    ...(params.sendUpdates && { sendUpdates: params.sendUpdates }),
  });

  return { success: true };
}
