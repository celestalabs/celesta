import { PieceName } from "@celesta/tools/pieces/pieceName.ts";
import { createRoot } from "react-dom/client";

async function handleStartOAuthFlow() {
  const BASE_URL = "http://localhost:8080";

  const oAuthUrl = new URL(`${BASE_URL}/api/getOAuthUrl`);
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
      const response = await fetch(`${BASE_URL}/api/oauth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          redirectUri: redirectUrl,
          pieceName: PieceName.GOOGLE_DRIVE,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Token exchange failed: ${response.status} - ${JSON.stringify(errorData)}`
        );
      }

      // 4. Return the tokens obtained from the server
      console.log({ successfulAuthentication: await response.json() });
    } catch (error) {
      console.error(error);
      console.error("Token exchange error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
            ? String((error as { message: unknown }).message)
            : "Unknown error";

      throw new Error(`Failed to exchange authorization code: ${errorMessage}`);
    }
  } else {
    console.error("OAuth flow failed");
  }
}

function App() {
  return (
    <button onClick={handleStartOAuthFlow}>Start Google Drive Auth</button>
  );
}

const root = document.getElementById("root");
root != null && createRoot(root).render(<App />);
