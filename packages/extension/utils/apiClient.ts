import { createIntegrationsClient } from "@celesta/server";

export const apiClient = createIntegrationsClient(
  import.meta.env.VITE_AGENT_SERVER_HTTP_URL!
);
