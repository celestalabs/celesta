import type { ExecuteIntegrationHandler } from "./routes/executeIntegration.ts";
import type { GenerateOAuthAccessTokenHandler } from "./routes/generateOAuthAccessToken.ts";
import type { GenerateOAuthRedirectUrlHandler } from "./routes/generateOAuthRedirectUrl.ts";

const GENERIC_FETCHER =
  (method: "GET" | "POST" | "PUT" | "DELETE", url: string) =>
  async ({
    body,
    headers,
    params,
  }: {
    params?: object;
    body?: object;
    headers?: Record<string, string>;
  }) => {
    const urlObj = new URL(url);
    if (params != null) {
      Object.entries(params).forEach(([key, value]) => {
        urlObj.searchParams.append(key, String(value));
      });
    }

    const fetchData = {
      method,
      headers: { ...headers, "Content-Type": "application/json" },
    } as RequestInit;
    
    if (body != null) {
      fetchData.body = JSON.stringify(body);
    }

    const res = await fetch(urlObj, fetchData);
    return res.json();
  };

export const createIntegrationApiClient = (baseUrl: string) =>
  ({
    generateOAuthRedirectUrl: GENERIC_FETCHER(
      "GET",
      `${baseUrl}/api/generateOAuthRedirectUrl`
    ) as GenerateOAuthRedirectUrlHandler,
    generateOAuthAccessToken: GENERIC_FETCHER(
      "POST",
      `${baseUrl}/api/generateOAuthAccessToken`
    ) as GenerateOAuthAccessTokenHandler,
    executeIntegration: GENERIC_FETCHER(
      "POST",
      `${baseUrl}/api/executeIntegration`
    ) as ExecuteIntegrationHandler,
  }) as const;
