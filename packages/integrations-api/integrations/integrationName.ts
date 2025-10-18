import { isPieceName, type PieceName } from "../pieces/pieceName.ts";

export enum NonPieceIntegrationName {
  BROWSER_USE = "browser_use",
  GMAIL = "gmail",
  GOOGLE_CALENDAR = "google_calendar",
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

export function isIntegrationName(
  integrationName: any
): integrationName is IntegrationName {
  return (
    isPieceName(integrationName) || isNonPieceIntegrationName(integrationName)
  );
}
