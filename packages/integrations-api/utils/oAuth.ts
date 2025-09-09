import { pieceAuthByName } from "../pieces/pieceData.ts";
import { OAuth2PropertyValue } from "@activepieces/pieces-framework";
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

export function getOAuthConfig(provider: string): {
  clientId: string | undefined;
  clientSecret: string | undefined;
  authUrl: string | undefined;
  tokenUrl: string | undefined;
  scope: string[] | undefined;
} | null {
  console.log("Getting OAuth config for provider:", provider);
  const normalizedProvider = provider.toLowerCase();

  if (!isPieceName(normalizedProvider)) {
    return null;
  }

  const pieceAuth = pieceAuthByName[normalizedProvider];
  const clientId = clientIdByPieceName[normalizedProvider]();
  const clientSecret = clientSecretByPieceName[normalizedProvider]();

  if (!pieceAuth) {
    console.error("Authentication failed: PieceAuth not found for", normalizedProvider);
    return null;
  }
  
  if (!clientId || !clientSecret) {
    console.error("Authentication failed: Missing client credentials for", normalizedProvider);
    return null;
  }

  return {
    ...pieceAuth,
    clientId,
    clientSecret,
  };
}
