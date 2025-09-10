import z from "zod";
import {
  NonPieceIntegrationName,
  readIntegrationMetadata,
  type IntegrationMetadata,
} from "../integrations/index.ts";
import { PieceName } from "../pieces/pieceName.ts";
import type { TypedFetcher } from "../utils/wrappedRouter.ts";

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
    integrations: ResponseMetadata[];
  },
  undefined
>;

export const ListIntegrationsHandler: ListIntegrationsHandler = async () => {
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
      .map((wow) => {
        const clone = { ...wow } as IntegrationMetadata & { success?: true };
        delete clone.success;
        clone.actions.forEach((action) => {
          (action as ResponseMetadata["actions"][number]).props =
            z.toJSONSchema(action.props);
        });
        return clone as ResponseMetadata;
      }),
  };
};
