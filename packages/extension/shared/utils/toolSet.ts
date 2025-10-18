import { IntegrationMetadata } from "@celesta/integrations-api/integrations/integrationMetadata";
import {
  IntegrationName,
  isIntegrationName,
} from "@celesta/integrations-api/integrations/integrationName";
import { isPieceName } from "@celesta/integrations-api/pieces/pieceName";
import { jsonSchema, tool, ToolSet } from "ai";
import { integrationApiClient } from "./integrationApiClient";

const toolSet: ToolSet = {};
export const metadataByToolName: Partial<
  Record<IntegrationName, Omit<IntegrationMetadata, "actions">>
> = {};

const authMap: Partial<Record<IntegrationName, string>> = {};

async function getAccessTokenByIntegration(integrationName: IntegrationName) {
  if (authMap[integrationName] != null) {
    return authMap[integrationName]!;
  }

  const redirectUrl = browser.identity.getRedirectURL(integrationName);

  const state = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const responseUrlRes = await integrationApiClient.generateOAuthRedirectUrl({
    params: { pieceName: integrationName, redirectUrl, state },
  });

  if (!responseUrlRes.success) {
    console.error("Failed to get OAuth URL:", responseUrlRes.error);
    return;
  }

  const responseUrl = await browser.identity.launchWebAuthFlow({
    url: responseUrlRes.url,
    interactive: true,
  });

  if (responseUrl == null) {
    console.error("OAuth flow was canceled or failed");
    return;
  }

  const url = new URL(responseUrl);
  const code = url.searchParams.get("code");
  const responseState = url.searchParams.get("state");

  // Validate state to prevent CSRF attacks
  if (responseState !== state) {
    throw new Error("State mismatch - possible CSRF attack");
  }

  if (!code) {
    throw new Error("Authentication failed - no code returned");
  }

  if (!isPieceName(integrationName)) {
    throw new Error(`Integration ${integrationName} is not a valid piece name`);
  }

  const response = await integrationApiClient.generateOAuthAccessToken({
    body: {
      code,
      redirectUri: redirectUrl,
      pieceName: integrationName,
    },
  });

  if (!response.success) {
    throw new Error(`Token exchange failed: ${response.error}`);
  }

  // 4. Return the tokens obtained from the server
  console.log(response);
  authMap[integrationName] = response.accessToken;
  return response.accessToken;
}

export const getToolSet = () => toolSet;

export async function populateToolSet() {
  if (Object.keys(toolSet).length > 0) {
    return;
  }
  const res = await integrationApiClient.listIntegrations({});
  if (res.success) {
    for (const [integrationName, integration] of Object.entries(
      res.integrations
    )) {
      metadataByToolName[integrationName as IntegrationName] = integration;

      for (const action of integration.actions) {
        if (!isIntegrationName(integrationName)) {
          console.warn(`Skipping invalid integration name: ${integrationName}`);
          continue;
        }

        const combinedActionName = `${integrationName}__${action.name}`;

        toolSet[combinedActionName] = tool({
          name: combinedActionName,
          description: action.description,
          inputSchema: jsonSchema(action.props),
          async execute(params) {
            const token = await getAccessTokenByIntegration(integrationName);
            if (!token) {
              return `Error: Unable to get access token for ${integrationName}`;
            }

            const execRes = await integrationApiClient.executeIntegration({
              body: {
                integrationName: integrationName,
                actionName: action.name,
                props: params,
                auth: {
                  access_token: token,
                },
              },
            });

            if (execRes.success) {
              return execRes.result;
            } else {
              return `Error (code ${execRes.code}): ${execRes.error}`;
            }
          },
        });
      }
    }
  }
}
