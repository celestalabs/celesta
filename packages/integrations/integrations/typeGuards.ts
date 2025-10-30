import {
  type IntegrationName,
  NonPieceIntegrationName,
  PieceName,
} from "@celesta/common";

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
