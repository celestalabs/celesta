export enum PieceName {
  GOOGLE_DRIVE = "google_drive",
  GOOGLE_CONTACTS = "google_contacts",
}

export enum NonPieceIntegrationName {
  BROWSER_CONTEXT = "browser_context",
  AGENTIC_BROWSING = "agentic_browsing",
  GMAIL = "gmail",
  GOOGLE_CALENDAR = "google_calendar",
  WEB_SEARCH = "web_search",
}

export type IntegrationName = NonPieceIntegrationName | PieceName;

export function isNonPieceIntegrationName(
  value: any
): value is NonPieceIntegrationName {
  return (
    Object.entries(NonPieceIntegrationName).findIndex(
      ([_, v]) => v === value
    ) !== -1
  );
}

// type guard for piecename
export function isPieceName(value: any): value is PieceName {
  return Object.entries(PieceName).findIndex(([_, v]) => v === value) !== -1;
}

export function isIntegrationName(
  integrationName: any
): integrationName is IntegrationName {
  return (
    isPieceName(integrationName) || isNonPieceIntegrationName(integrationName)
  );
}
