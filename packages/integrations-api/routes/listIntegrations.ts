import z from "zod";
import {
  readIntegrationMetadata,
  type IntegrationMetadata,
} from "../integrations/integrationMetadata.ts";
import { PieceName } from "../pieces/pieceName.ts";
import type { TypedFetcher } from "../utils/wrappedRouter.ts";
import { NonPieceIntegrationName, type IntegrationName } from "../integrations/integrationName.ts";

type ResponseMetadata = Omit<IntegrationMetadata, "actions"> & {
  actions: {
    name: string;
    description: string;
    props: object;
  }[];
};

export type ListIntegrationsHandler = TypedFetcher<
  {
    success: true;
    code: number;
    integrations: Record<IntegrationName, ResponseMetadata>;
  },
  undefined
>;

let cachedIntegrations: Record<IntegrationName, ResponseMetadata> | undefined;

export const ListIntegrationsHandler: ListIntegrationsHandler = async () => {
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

  return {
    success: true,
    code: 200,
    integrations: cachedIntegrations,
  };
};
