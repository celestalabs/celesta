import type {
  GenerateOAuthAccessTokenHandler,
  GenerateOAuthRedirectUrlHandler,
  ExecuteIntegrationHandler,
  ListIntegrationsHandler,
} from "@celesta/integrations";

const GENERIC_FETCHER = <T>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  url: string
) =>
  (async ({
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
  }) as T;

export const createIntegrationsClient = (baseUrl: string) =>
  ({
    generateOAuthRedirectUrl: GENERIC_FETCHER<GenerateOAuthRedirectUrlHandler>(
      "GET",
      `${baseUrl}/api/generateOAuthRedirectUrl`
    ),
    generateOAuthAccessToken: GENERIC_FETCHER<GenerateOAuthAccessTokenHandler>(
      "POST",
      `${baseUrl}/api/generateOAuthAccessToken`
    ),
    executeIntegration: GENERIC_FETCHER<ExecuteIntegrationHandler>(
      "POST",
      `${baseUrl}/api/executeIntegration`
    ),
    listIntegrations: GENERIC_FETCHER<ListIntegrationsHandler>(
      "GET",
      `${baseUrl}/api/listIntegrations`
    ),
  }) as const;
