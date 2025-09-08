import { createIntegrationApiClient } from "@celesta/integrations-api/client.ts";
import { PieceName } from "@celesta/integrations-api/pieces/pieceName.ts";
import { createRoot } from "react-dom/client";

const INTEGRATION_API_URL = "http://localhost:8080";

const integrationApiClient = createIntegrationApiClient(INTEGRATION_API_URL);

function App() {
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const handleStartOAuthFlow = useCallback(async () => {
    const oAuthUrl = new URL(`${INTEGRATION_API_URL}/api/oauth/redirect`);
    oAuthUrl.searchParams.append("pieceName", PieceName.GOOGLE_DRIVE);
    const redirectUrl = browser.identity.getRedirectURL(PieceName.GOOGLE_DRIVE);
    oAuthUrl.searchParams.append("redirectUrl", redirectUrl);

    const state = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    oAuthUrl.searchParams.append("state", state);

    const responseUrl = await browser.identity.launchWebAuthFlow({
      url: oAuthUrl.toString(),
      interactive: true,
    });

    if (responseUrl) {
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

      try {
        const response = await integrationApiClient.getToken({
          body: {
            code,
            redirectUri: redirectUrl,
            pieceName: PieceName.GOOGLE_DRIVE,
          },
        });

        if (!response.success) {
          throw new Error(`Token exchange failed: ${response.error}`);
        }

        // 4. Return the tokens obtained from the server
        console.log(response);
        setAccessToken(response.accessToken);
      } catch (error) {
        console.error(error);
        console.error("Token exchange error:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : typeof error === "object" && error !== null && "message" in error
              ? String((error as { message: unknown }).message)
              : "Unknown error";

        throw new Error(
          `Failed to exchange authorization code: ${errorMessage}`
        );
      }
    } else {
      console.error("OAuth flow failed");
    }
  }, []);

  const handlePerformAction = useCallback(async () => {
    if (!accessToken) {
      console.error("No access token available");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8080/api/tool/execute-oauth`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pieceName: PieceName.GOOGLE_DRIVE,
            action: "list-files",
            props: {
              pageSize: 10,
              folderId: "root",
            },
            auth: {
              access_token: accessToken,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Action execution failed: ${response.status} - ${JSON.stringify(errorData)}`
        );
      }

      const res = await response.json();
      console.log({ actionResult: res });
    } catch (error) {
      console.error("Action execution error:", error);
    }
  }, [accessToken]);

  return (
    <div>
      {accessToken !== null ? (
        <div>
          <div>Access granted!</div>
          <hr />
          <button onClick={handlePerformAction}>Perform action</button>
        </div>
      ) : (
        <button onClick={handleStartOAuthFlow}>Start Google Drive Auth</button>
      )}
    </div>
  );
}

const root = document.getElementById("root");
root != null && createRoot(root).render(<App />);
