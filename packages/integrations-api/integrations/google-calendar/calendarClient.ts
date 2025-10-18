import { google } from 'googleapis';
import type { CalendarAuth } from './types.ts';

export class CalendarClient {
  private calendar;
  private auth;

  constructor(accessToken: string) {
    // Create OAuth2 client with the access token
    this.auth = new google.auth.OAuth2();
    this.auth.setCredentials({
      access_token: accessToken,
    });

    // Initialize Calendar API client
    this.calendar = google.calendar({
      version: 'v3',
      auth: this.auth,
    });
  }

  /**
   * Get the authenticated Calendar API instance
   */
  getCalendarApi() {
    return this.calendar;
  }
}

/**
 * Factory function to create a Calendar client instance
 */
export function createCalendarClient(auth: CalendarAuth): CalendarClient {
  return new CalendarClient(auth.access_token);
}
