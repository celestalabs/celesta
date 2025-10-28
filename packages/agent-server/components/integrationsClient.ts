import { createIntegrationApiClient } from "@celesta/integrations-api/client.js";

if (!process.env.INTEGRATIONS_API_URL) {
  throw new Error("INTEGRATIONS_API_URL is not defined");
}

export const integrationsClient = createIntegrationApiClient(
  process.env.INTEGRATIONS_API_URL
);
