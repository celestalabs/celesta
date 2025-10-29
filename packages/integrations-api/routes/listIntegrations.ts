import z from "zod";
import {
  readIntegrationMetadata,
  type IntegrationMetadata,
} from "../integrations/integrationMetadata.ts";
import {
  NonPieceIntegrationName,
  type IntegrationName,
} from "../integrations/integrationName.ts";
import { PieceName } from "../pieces/pieceName.ts";
import type { TypedFetcher } from "../utils/wrappedRouter.ts";

type ResponseMetadata = Omit<IntegrationMetadata, "actions"> & {
  actions: {
    name: string;
    description: string;
    props: object;
    mode: "chat" | "workflow" | "all";
  }[];
};

export type ListIntegrationsHandler = TypedFetcher<
  {
    success: true;
    code: number;
    integrations: Record<IntegrationName, ResponseMetadata>;
  },
  undefined,
  undefined,
  {
    mode?: "chat" | "workflow" | "all";
  }
>;

let cachedIntegrations: Record<IntegrationName, ResponseMetadata> | undefined;

export const ListIntegrationsHandler: ListIntegrationsHandler = async (req) => {
  const requestedMode = req?.params?.mode;

  if (!cachedIntegrations) {
    cachedIntegrations = Object.fromEntries(
      Object.values({
        ...NonPieceIntegrationName,
        ...PieceName,
      })
        .map((name) => [name, readIntegrationMetadata(name)] as const)
        .filter(
          (
            result
          ): result is [
            IntegrationName,
            IntegrationMetadata & { success: true },
          ] => result[1].success
        )
        .map(([name, wow]) => {
          const clone = { ...wow } as IntegrationMetadata & { success?: true };
          delete clone.success;
          clone.actions.forEach((action) => {
            (action as ResponseMetadata["actions"][number]).props =
              z.toJSONSchema(action.props);
          });
          return [name, clone] as [IntegrationName, ResponseMetadata];
        })
    ) as Record<IntegrationName, ResponseMetadata>;
  }

  // Filter integrations based on requested mode
  let filteredIntegrations = cachedIntegrations;

  if (requestedMode === "chat" || requestedMode === "workflow") {
    filteredIntegrations = Object.fromEntries(
      Object.entries(cachedIntegrations)
        .map(([name, integration]) => {
          // Filter actions based on mode
          const filteredActions = integration.actions.filter(
            (action) => action.mode === "all" || action.mode === requestedMode
          );

          // Only include integrations that have at least one matching action
          if (filteredActions.length === 0) {
            return null;
          }

          return [
            name,
            {
              ...integration,
              actions: filteredActions,
            },
          ];
        })
        .filter((entry): entry is [string, ResponseMetadata] => entry !== null)
    ) as Record<IntegrationName, ResponseMetadata>;
  }

  return {
    success: true,
    code: 200,
    integrations: filteredIntegrations,
  };
};
