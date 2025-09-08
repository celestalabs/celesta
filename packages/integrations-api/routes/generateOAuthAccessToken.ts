import { getOAuthConfig } from "../utils/oAuth.ts";
import { isPieceName, PieceName } from "../pieces/pieceName.ts";
import axios from "axios";
import type { TypedFetcher } from "../utils/wrappedRouter.ts";

export type GenerateOAuthAccessTokenHandler = TypedFetcher<
  /* Response */ {
    success: true;
    code: 200;
    accessToken: string;
    expiresIn: number;
    tokenType: string;
  },
  /* Body */ {
    code: string;
    redirectUri: string;
    pieceName: PieceName;
  }
>;

export const GenerateOAuthAccessTokenHandler: GenerateOAuthAccessTokenHandler =
  async ({ body }) => {
    const { code, redirectUri, pieceName } = body;

    if (!code || !redirectUri || !isPieceName(pieceName)) {
      return {
        success: false,
        code: 400,
        error: "Missing/malformed required parameters",
      };
    }

    // Get OAuth configuration based on provider
    const config = getOAuthConfig(pieceName);
    if (!config) {
      return {
        success: false,
        code: 400,
        error: "Invalid or unsupported provider",
      };
    }

    // Exchange authorization code for tokens
    if (!config.clientId || !config.clientSecret || !config.tokenUrl) {
      return {
        success: false,
        code: 400,
        error: "Incomplete OAuth configuration",
      };
    }

    try {
      const tokenResponse = await axios({
        method: "post",
        url: config.tokenUrl,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        data: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: redirectUri,
        }).toString(),
      });

      return {
        success: true,
        code: 200,
        accessToken: tokenResponse.data.access_token,
        expiresIn: tokenResponse.data.expires_in,
        tokenType: tokenResponse.data.token_type,
      };
    } catch (error) {
      const typedError = error as {
        response?: { data: any };
        message?: string;
      };
      console.error(
        "Token exchange error:",
        typedError.response?.data || typedError.message
      );
      const errorMessage = typedError.response?.data
        ? `Failed to exchange authorization code for tokens: ${JSON.stringify(typedError.response.data)}`
        : typedError.message
          ? `Failed to exchange authorization code for tokens: ${typedError.message}`
          : "Failed to exchange authorization code for tokens";

      return {
        success: false,
        code: 500,
        error: errorMessage,
      };
    }
  };
