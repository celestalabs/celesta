import { createIntegrationApiClient } from "@celesta/integrations-api/client";
import { PieceName } from "@celesta/integrations-api/pieces/pieceName.ts";
import { createRoot } from "react-dom/client";

const INTEGRATION_API_URL = "http://localhost:8080";

const integrationApiClient = createIntegrationApiClient(INTEGRATION_API_URL);

function App() {
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const handleStartOAuthFlow = useCallback(async () => {
    const redirectUrl = browser.identity.getRedirectURL(PieceName.GOOGLE_DRIVE);

    const state = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const responseUrlRes = await integrationApiClient.generateOAuthRedirectUrl({
      params: { pieceName: PieceName.GOOGLE_DRIVE, redirectUrl, state },
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

    const response = await integrationApiClient.generateOAuthAccessToken({
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
  }, []);

  const handlePerformAction = useCallback(async () => {
    if (!accessToken) {
      console.error("No access token available");
      return;
    }

    const executionResponse = await integrationApiClient.executeIntegration({
      body: {
        pieceName: PieceName.GOOGLE_DRIVE,
        action: "list-files",
        props: {
          pageSize: 10,
          folderId: "root",
        },
        auth: {
          access_token: accessToken,
        },
      },
    });

    if (!executionResponse.success) {
      console.error("Action execution failed:", executionResponse.error);
      return;
    }

    console.log({ actionResult: executionResponse.result });
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
