import { isPieceName } from "../pieces/pieceName.ts";
import { isOAuth2PropertyValue } from "../utils/oAuth.ts";
import { type TypedFetcher } from "../utils/wrappedRouter.ts";
import { isIntegrationName, isNonPieceIntegrationName } from "../integrations/integrationName.ts";
import { executePieceAction } from "../pieces/executePieceAction.ts";
import { executeCustomIntegration } from "../integrations/executeCustomIntegration.ts";

export type ExecuteIntegrationHandler = TypedFetcher<
  /* Response */ {
    success: true;
    code: 200;
    result: unknown;
  },
  /* Body */ {
    integrationName: string;
    actionName: string;
    props: object;
    // For simplicity, we only support OAuth2 for now.
    auth: { access_token: string };
  }
>;

export const ExecuteIntegrationHandler: ExecuteIntegrationHandler = async ({
  body,
}) => {
  const { integrationName, actionName, props, auth } = body;

  if (
    !isIntegrationName(integrationName) ||
    typeof actionName !== "string" ||
    typeof props !== "object" ||
    !isOAuth2PropertyValue(auth)
  ) {
    return {
      success: false,
      code: 400,
      error: "Invalid request body",
    };
  }

  if (isPieceName(integrationName)) {
    const response = await executePieceAction(
      integrationName,
      actionName,
      props,
      auth
    );

    return response.success
      ? { success: true, code: 200, result: response.data }
      : { ...response, code: 500 };
  }

  if (isNonPieceIntegrationName(integrationName)) {
    const response = await executeCustomIntegration(
      integrationName,
      actionName,
      props,
      auth
    );

    return response.success
      ? { success: true, code: 200, result: response.data }
      : { ...response, code: 500 };
  }

  // Should never reach here due to isIntegrationName check above
  return {
    success: false,
    code: 400,
    error: "Integration not yet supported: " + integrationName,
  };
};
