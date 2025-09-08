import { pieceAuthByName } from "../pieces/pieceData.ts";
import { OAuth2PropertyValue } from "@activepieces/pieces-framework";
import { isPieceName } from "../pieces/pieceName.ts";
import {
  getClientIdByPieceName,
  getClientSecretByPieceName,
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
  const normalizedProvider = provider.toLowerCase();

  if (!isPieceName(normalizedProvider)) {
    return null;
  }

  const pieceAuth = pieceAuthByName[normalizedProvider];
  const clientId = getClientIdByPieceName(normalizedProvider);
  const clientSecret = getClientSecretByPieceName(normalizedProvider);

  if (!pieceAuth || !clientId || !clientSecret) {
    return null;
  }

  return {
    ...pieceAuth,
    clientId,
    clientSecret,
  };
}
