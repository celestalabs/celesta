import { pieceByName } from "../pieces/pieceData.ts";
import { isPieceName, type PieceName } from "../pieces/pieceName.ts";
import type { SuccessResponse } from "../utils/responseType.ts";

export enum NonPieceIntegrationName {
  BROWSER_USE = "browser_use",
}

export function isNonPieceIntegrationName(
  value: any
): value is NonPieceIntegrationName {
  return (
    Object.entries(NonPieceIntegrationName).findIndex(
      ([_, v]) => v === value
    ) !== -1
  );
}

export type IntegrationName = NonPieceIntegrationName | PieceName;

export function isIntegrationName(
  integrationName: any
): integrationName is IntegrationName {
  return (
    isPieceName(integrationName) || isNonPieceIntegrationName(integrationName)
  );
}

export type IntegrationMetadata = {
  friendlyName: string;
  description: string;
  logoUrl: string | null;
  actions: { friendlyName: string; description: string }[];
};

const nonPieceIntegrationMetadata: Record<
  NonPieceIntegrationName,
  IntegrationMetadata
> = {
  [NonPieceIntegrationName.BROWSER_USE]: {
    friendlyName: "Browser Use Agent",
    description: "Interact directly with the user's browser.",
    logoUrl: null,
    actions: [
      {
        friendlyName: "Goal-oriented browsing",
        description:
          "Launch an agent on the user's browser, to complete a goal, such as information retrieval, task completion, etc.",
      },
    ],
  },
};

export function readIntegrationMetadata(
  integrationName: string
): SuccessResponse<IntegrationMetadata> {
  if (!isIntegrationName(integrationName)) {
    return { success: false, error: "Invalid integration" };
  }

  // Piece name
  if (isPieceName(integrationName)) {
    const piece = pieceByName[integrationName];
    const friendlyName = piece.displayName;
    const description = piece.description;
    const actionData: IntegrationMetadata["actions"] = [];
    const logoUrl = piece.logoUrl;

    for (let action of Object.values(piece.actions())) {
      actionData.push({
        friendlyName: action.displayName,
        description: action.description,
      });
    }

    return {
      success: true,
      friendlyName,
      description,
      logoUrl,
      actions: actionData,
    };
  }

  // non piece integration
  return { success: true, ...nonPieceIntegrationMetadata[integrationName] };
}
