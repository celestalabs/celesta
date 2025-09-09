import { createIntegrationApiClient } from "@celesta/integrations-api/client";
import { PieceName } from "@celesta/integrations-api/pieces/pieceName.ts";
import { useCallback, useState } from "react";
import { createRoot } from "react-dom/client";

const INTEGRATION_API_URL = "http://localhost:8080";

const integrationApiClient = createIntegrationApiClient(INTEGRATION_API_URL);

function App() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [integrationName, setIntegrationName] = useState<PieceName>(
    PieceName.GOOGLE_DRIVE
  );
  const [actionName, setActionName] = useState<string>("list-files");
  const [customProps, setCustomProps] = useState<string>(
    '{"pageSize": 10, "folderId": "root"}'
  );
  const [executionResult, setExecutionResult] = useState<{
    success: boolean;
    data?: any;
    error?: string;
  } | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const handleStartOAuthFlow = useCallback(async () => {
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
    setAccessToken(response.accessToken);
  }, [integrationName]);

  const handlePerformAction = useCallback(async () => {
    if (!accessToken) {
      console.error("No access token available");
      return;
    }

    // Reset previous results and set executing state
    setExecutionResult(null);
    setIsExecuting(true);

    let parsedProps = {};
    try {
      parsedProps = JSON.parse(customProps);
    } catch (e: unknown) {
      setIsExecuting(false);
      setExecutionResult({
        success: false,
        error: `Failed to parse JSON: ${e instanceof Error ? e.message : String(e)}`,
      });
      return;
    }

    try {
      const executionResponse = await integrationApiClient.executeIntegration({
        body: {
          integrationName: integrationName,
          actionName: actionName,
          props: parsedProps,
          auth: {
            access_token: accessToken,
          },
        },
      });

      if (!executionResponse.success) {
        setExecutionResult({
          success: false,
          error: executionResponse.error || "Unknown error occurred",
        });
      } else {
        setExecutionResult({
          success: true,
          data: executionResponse.result,
        });
      }
    } catch (error) {
      setExecutionResult({
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsExecuting(false);
    }
  }, [accessToken, integrationName, actionName, customProps]);

  return (
    <div className="p-4">
      {accessToken === null ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Integration Name:
            </label>
            <select
              className="w-full p-2 border rounded"
              value={integrationName}
              onChange={(e) => setIntegrationName(e.target.value as PieceName)}
            >
              {Object.values(PieceName).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <button
            className="w-full p-2 bg-blue-500 text-white rounded"
            onClick={handleStartOAuthFlow}
          >
            Start Authentication
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-green-600 font-medium">
            Authentication Successful!
          </div>
          <hr />

          <div className="space-y-2">
            <label className="block text-sm font-medium">Action Name:</label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              value={actionName}
              onChange={(e) => setActionName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Custom Props (JSON):
            </label>
            <textarea
              className="w-full p-2 border rounded h-24 font-mono text-sm"
              value={customProps}
              onChange={(e) => setCustomProps(e.target.value)}
            />
          </div>

          <button
            className="w-full p-2 bg-green-500 text-white rounded"
            onClick={handlePerformAction}
            disabled={isExecuting}
          >
            {isExecuting ? "Executing..." : "Execute Action"}
          </button>

          {executionResult && (
            <div className="mt-4 border rounded p-3">
              <div
                className={`font-medium ${executionResult.success ? "text-green-600" : "text-red-600"}`}
              >
                {executionResult.success ? "Success" : "Failed"}
              </div>

              {executionResult.success ? (
                <div className="mt-2">
                  <div className="text-sm font-medium mb-1">Response Data:</div>
                  <pre className="bg-gray-100 p-2 rounded overflow-auto text-xs max-h-64">
                    {JSON.stringify(executionResult.data, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="mt-2">
                  <div className="text-sm font-medium mb-1">Error:</div>
                  <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded text-sm">
                    {executionResult.error}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const root = document.getElementById("root");
root != null && createRoot(root).render(<App />);
