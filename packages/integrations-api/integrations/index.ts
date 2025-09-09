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
  name: string;
  description: string;
  logoUrl: string | null;
  actions: { name: string; description: string; props: object }[];
};

const nonPieceIntegrationMetadata: Record<
  NonPieceIntegrationName,
  IntegrationMetadata
> = {
  [NonPieceIntegrationName.BROWSER_USE]: {
    name: "Browser Use Agent",
    description: "Interact directly with the user's browser.",
    logoUrl: null,
    actions: [
      {
        name: "goalOrientedBrowsing",
        description:
          "Launch an agent on the user's browser, to complete a goal, such as information retrieval, task completion, etc.",
        props: {
          goal: "string",
          responseType: "What do you want me to return to you?",
        },
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
    const name = piece.displayName;
    const description = piece.description;
    const actionData: IntegrationMetadata["actions"] = [];
    const logoUrl = piece.logoUrl;

    for (let action of Object.values(piece.actions())) {
      actionData.push({
        name: action.name,
        description: action.description,
        props: action.props,
      });
    }

    return {
      success: true,
      name,
      description,
      logoUrl,
      actions: actionData,
    };
  }

  // non piece integration
  return { success: true, ...nonPieceIntegrationMetadata[integrationName] };
}
