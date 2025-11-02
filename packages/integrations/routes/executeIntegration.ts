import {
  type IntegrationName,
  isIntegrationName,
  isNonPieceIntegrationName,
  isPieceName,
  logger,
} from "@celesta/common";
import { executeCustomIntegration } from "../integrations/executeCustomIntegration.ts";
import {
  readIntegrationMetadata,
  type ClientContext,
} from "../integrations/integrationMetadata.ts";
import { executePieceAction } from "../pieces/executePieceAction.ts";
import { isOAuth2PropertyValue } from "../utils/oAuth.ts";
import { type TypedFetcher } from "../utils/TypedFetcher.ts";

const log = logger("executeIntegration");

/**
 * Get server-side API key for integrations that don't require user auth
 */
function getServerApiKey(integrationName: IntegrationName): string | null {
  const envKeyMap: Partial<Record<IntegrationName, string>> = {
    // Server-authenticated integrations
    web_search: "EXA_API_KEY",
  };

  const envKey = envKeyMap[integrationName];
  return envKey ? process.env[envKey] || null : null;
}

export type ExecuteIntegrationHandler = TypedFetcher<
  /* Response */ {
    success: true;
    code: 200;
    result: unknown;
  },
  /* Body */ {
    context: ClientContext;
    integrationName: string;
    actionName: string;
    props: object;
    auth?: { access_token: string } | undefined; // Now optional
  }
>;

export const ExecuteIntegrationHandler: ExecuteIntegrationHandler = async ({
  body,
}) => {
  const { integrationName, actionName, props, auth, context } = body;

  log("Received execute integration request:", body);

  // Basic validation
  if (
    !isIntegrationName(integrationName) ||
    typeof actionName !== "string" ||
    typeof props !== "object"
  ) {
    return {
      success: false,
      code: 400,
      error: "Invalid request body",
    };
  }

  // Get integration metadata to check auth requirements
  const metadataResult = readIntegrationMetadata(integrationName);
  if (!metadataResult.success) {
    return {
      success: false,
      code: 400,
      error: "Integration not found",
    };
  }

  // Handle authentication based on integration requirements
  let finalAuth: { access_token: string } | null = null;

  if (metadataResult.requiresUserAuth) {
    // User auth required - must be provided by client
    if (!auth || !isOAuth2PropertyValue(auth)) {
      return {
        success: false,
        code: 401,
        error: "Authentication required for this integration",
      };
    }
    finalAuth = auth;
  } else {
    // No user auth required - try to get server credentials if needed
    const serverKey = getServerApiKey(integrationName);
    if (serverKey) {
      finalAuth = { access_token: serverKey };
    }
    // If no server key, finalAuth stays null (some integrations need no auth at all)
  }

  if (isPieceName(integrationName)) {
    // Pieces require auth, finalAuth is guaranteed to be non-null here
    if (!finalAuth) {
      return {
        success: false,
        code: 500,
        error: "Server configuration error: missing credentials",
      };
    }

    const response = await executePieceAction(
      integrationName,
      actionName,
      props,
      finalAuth
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
      finalAuth,
      context
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
