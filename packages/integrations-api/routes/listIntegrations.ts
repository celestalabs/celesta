import {
  NonPieceIntegrationName,
  readIntegrationMetadata,
  type IntegrationMetadata,
} from "../integrations/index.ts";
import { PieceName } from "../pieces/pieceName.ts";
import type { TypedFetcher } from "../utils/wrappedRouter.ts";

export type ListIntegrationsHandler = TypedFetcher<
  {
    success: true;
    code: number;
    integrations: IntegrationMetadata[];
  },
  {}
>;

export const ListIntegrationsHandler: ListIntegrationsHandler = async ({
  body,
}) => {
  return {
    success: true,
    code: 200,
    integrations: Object.values({
      ...NonPieceIntegrationName,
      ...PieceName,
    })
      .map(readIntegrationMetadata)
      .filter(
        (result): result is IntegrationMetadata & { success: true } =>
          result.success
      )
      .map((wow) => ({
        friendlyName: wow.friendlyName,
        description: wow.description,
        actions: wow.actions,
      })),
  };
};
