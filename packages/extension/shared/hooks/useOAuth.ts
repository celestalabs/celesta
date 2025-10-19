import { createIntegrationApiClient } from "@celesta/integrations-api/client.js";
import { isIntegrationName } from "@celesta/integrations-api/integrations/integrationName";
import { PieceName } from "@celesta/integrations-api/pieces/pieceName.js";
import { useCallback, useMemo } from "react";

export function useOAuth(integrationApiUrl: string) {
  const integrationApiClient = useMemo(
    () => createIntegrationApiClient(integrationApiUrl),
    [integrationApiUrl]
  );

  const handleOAuthFlow = useCallback(
    async (integrationName: string): Promise<string | null> => {
      if (!isIntegrationName(integrationName)) {
        console.error("Invalid integration name:", integrationName);
        return null;
      }

      try {
        const redirectUrl = browser.identity.getRedirectURL(integrationName);

        const state = Array.from(crypto.getRandomValues(new Uint8Array(32)))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        const responseUrlRes =
          await integrationApiClient.generateOAuthRedirectUrl({
            params: {
              pieceName: integrationName as PieceName,
              redirectUrl,
              state,
            },
          });

        if (!responseUrlRes.success) {
          console.error("Failed to get OAuth URL:", responseUrlRes.error);
          return null;
        }

        const responseUrl = await browser.identity.launchWebAuthFlow({
          url: responseUrlRes.url,
          interactive: true,
        });

        if (responseUrl == null) {
          console.error("OAuth flow was canceled or failed");
          return null;
        }

        const url = new URL(responseUrl);
        const code = url.searchParams.get("code");
        const responseState = url.searchParams.get("state");

        if (responseState !== state) {
          throw new Error("State mismatch - possible CSRF attack");
        }

        if (!code) {
          throw new Error("Authentication failed - no code returned");
        }

        const response = await integrationApiClient.generateOAuthAccessToken({
          body: {
            code,
            redirectUri: redirectUrl,
            pieceName: integrationName as PieceName,
          },
        });

        if (!response.success) {
          throw new Error(`Token exchange failed: ${response.error}`);
        }

        return response.accessToken;
      } catch (error) {
        console.error("OAuth flow error:", error);
        return null;
      }
    },
    [integrationApiClient]
  );

  return { handleOAuthFlow };
}
