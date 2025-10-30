export enum PieceName {
  GOOGLE_DRIVE = "google_drive",
  GOOGLE_CONTACTS = "google_contacts",
}

export enum NonPieceIntegrationName {
  BROWSER_CONTEXT = "browser_context",
  GMAIL = "gmail",
  GOOGLE_CALENDAR = "google_calendar",
  WEB_SEARCH = "web_search",
}

export type IntegrationName = NonPieceIntegrationName | PieceName;
