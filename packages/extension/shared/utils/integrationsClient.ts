import { createIntegrationApiClient } from "@celesta/integrations-api/client";

export const integrationsClient = createIntegrationApiClient(
  import.meta.env.VITE_INTEGRATIONS_API_URL!
);
