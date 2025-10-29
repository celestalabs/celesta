import { createIntegrationsClient } from "@celesta/server";

export const integrationsClient = createIntegrationsClient(
  import.meta.env.VITE_AGENT_SERVER_HTTP_URL!
);
