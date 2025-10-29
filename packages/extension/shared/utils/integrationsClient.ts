import { createIntegrationsClient } from "../../../server/client";

export const integrationsClient = createIntegrationsClient(
  import.meta.env.VITE_AGENT_SERVER_HTTP_URL!
);
