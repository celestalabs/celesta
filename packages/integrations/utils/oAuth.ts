import { OAuth2PropertyValue } from "@activepieces/pieces-framework";
import {
  isNonPieceIntegrationName,
  NonPieceIntegrationName,
} from "../integrations/integrationName.ts";
import { pieceAuthByName } from "../pieces/pieceData.ts";
import { isPieceName } from "../pieces/pieceName.ts";
import {
  clientIdByPieceName,
  clientSecretByPieceName,
} from "../pieces/secrets.ts";

export function isOAuth2PropertyValue(
  something: unknown
): something is OAuth2PropertyValue {
  return (
    typeof something === "object" &&
    something !== null &&
    "access_token" in something &&
    typeof something.access_token === "string"
  );
}

// OAuth configuration for custom integrations
const customIntegrationOAuthConfig: Partial<
  Record<
    NonPieceIntegrationName,
    {
      authUrl: string;
      tokenUrl: string;
      scope: string[];
    } | null
  >
> = {
  [NonPieceIntegrationName.GMAIL]: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/gmail.compose",
    ],
  },
  [NonPieceIntegrationName.GOOGLE_CALENDAR]: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
    ],
  },
  [NonPieceIntegrationName.BROWSER_USE]: null, // No OAuth for browser use
};

export function getOAuthConfig(provider: string): {
  clientId: string | undefined;
  clientSecret: string | undefined;
  authUrl: string | undefined;
  tokenUrl: string | undefined;
  scope: string[] | undefined;
} | null {
  console.log("Getting OAuth config for provider:", provider);
  const normalizedProvider = provider.toLowerCase();

  // Check if it's a custom integration first
  if (isNonPieceIntegrationName(normalizedProvider)) {
    const customConfig = customIntegrationOAuthConfig[normalizedProvider];
    if (!customConfig) {
      return null;
    }

    return {
      clientId: process.env.TOOL_GOOGLE_CLIENT_ID,
      clientSecret: process.env.TOOL_GOOGLE_CLIENT_SECRET,
      authUrl: customConfig.authUrl,
      tokenUrl: customConfig.tokenUrl,
      scope: customConfig.scope,
    };
  }

  // Check if it's a piece integration
  if (!isPieceName(normalizedProvider)) {
    return null;
  }

  const pieceAuth = pieceAuthByName[normalizedProvider];
  const clientId = clientIdByPieceName[normalizedProvider]();
  const clientSecret = clientSecretByPieceName[normalizedProvider]();

  if (!pieceAuth) {
    console.error(
      "Authentication failed: PieceAuth not found for",
      normalizedProvider
    );
    return null;
  }

  if (!clientId || !clientSecret) {
    console.error(
      "Authentication failed: Missing client credentials for",
      normalizedProvider
    );
    return null;
  }

  return {
    ...pieceAuth,
    clientId,
    clientSecret,
  };
}
