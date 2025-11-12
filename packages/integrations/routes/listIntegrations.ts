import {
  NonPieceIntegrationName,
  type IntegrationName,
  PieceName,
} from "@celesta/common";
import {
  readIntegrationMetadata,
  type IntegrationMetadata,
} from "../integrations/integrationMetadata.ts";
import { type TypedFetcher } from "../../common/utils/TypedFetcher.ts";

export type ListIntegrationsHandler = TypedFetcher<
  {
    success: true;
    code: number;
    integrations: Record<IntegrationName, IntegrationMetadata>;
  },
  undefined
>;

export const ListIntegrationsHandler: ListIntegrationsHandler = async () => {
  const integrations = Object.fromEntries(
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
  ) as Record<IntegrationName, { success: true } & IntegrationMetadata>;

  return {
    success: true,
    code: 200,
    integrations,
  };
};
