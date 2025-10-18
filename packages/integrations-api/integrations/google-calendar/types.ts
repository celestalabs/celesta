export interface CalendarAuth {
  access_token: string;
}

export interface EventAttendee {
  email: string;
  displayName?: string;
  optional?: boolean;
  responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
}

export interface EventDateTime {
  dateTime?: string; // RFC3339 timestamp
  date?: string; // Date only (all-day events)
  timeZone?: string;
}

export interface EventReminder {
  method: 'email' | 'popup';
  minutes: number;
}

export interface CreateEventParams {
  summary: string; // Event title
  description?: string;
  location?: string;
  start: EventDateTime;
  end: EventDateTime;
  attendees?: EventAttendee[];
  reminders?: {
    useDefault?: boolean;
    overrides?: EventReminder[];
  };
  calendarId?: string; // Defaults to 'primary'
  colorId?: string;
  timeZone?: string;
}

export interface ListEventsParams {
  calendarId?: string; // Defaults to 'primary'
  timeMin?: string; // RFC3339 timestamp
  timeMax?: string; // RFC3339 timestamp
  maxResults?: number;
  pageToken?: string;
  q?: string; // Free text search
  singleEvents?: boolean; // Expand recurring events
  orderBy?: 'startTime' | 'updated';
}

export interface GetEventParams {
  eventId: string;
  calendarId?: string; // Defaults to 'primary'
}

export interface UpdateEventParams {
  eventId: string;
  calendarId?: string; // Defaults to 'primary'
  summary?: string;
  description?: string;
  location?: string;
  start?: EventDateTime;
  end?: EventDateTime;
  attendees?: EventAttendee[];
  reminders?: {
    useDefault?: boolean;
    overrides?: EventReminder[];
  };
  colorId?: string;
}

export interface DeleteEventParams {
  eventId: string;
  calendarId?: string; // Defaults to 'primary'
  sendUpdates?: 'all' | 'externalOnly' | 'none';
}

export interface QuickAddEventParams {
  text: string; // Natural language event description
  calendarId?: string; // Defaults to 'primary'
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
  status?: 'confirmed' | 'tentative' | 'cancelled';
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
