import { createIntegrationApiClient } from "@celesta/integrations-api/client";

export const integrationApiClient = createIntegrationApiClient(
  "http://localhost:8080"
);
