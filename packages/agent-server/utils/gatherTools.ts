import { jsonSchema, tool, Tool } from "ai";
import { sessionManager } from "../components/sessionManager.js";
import { MessageContext } from "../components/messageContext.js";
import { ClientId } from "@celesta/types";
import { integrationsClient } from "../components/integrationsClient.js";
import { isIntegrationName } from "@celesta/integrations-api/integrations/integrationMetadata.js";

export function gatherTools(
  messageContext: MessageContext,
  mode: "workflow" | "chat"
) {
  const integrations = Object.fromEntries(
    Object.entries(
      sessionManager.tools.get(messageContext.clientId) || {}
    ).flatMap(([integrationName, integrationMetadata]) =>
      integrationMetadata.actions
        .filter((a) => a.mode === mode || a.mode === "all")
        .map((action) => {
          if (!isIntegrationName(integrationName)) {
            return [];
          }

          const toolName = `${integrationName}__${action.name}`;
          return [
            toolName,
            tool({
              name: toolName,
              description:
                integrationMetadata.description + " - " + action.description,
              inputSchema: jsonSchema(action.props),
              async execute(input) {
                const handleToolResponse =
                  messageContext.sendToolInvocationMessage(toolName, input);

                const toolResponse =
                  await integrationsClient.executeIntegration({
                    body: {
                      integrationName,
                      actionName: action.name,
                      props: input as Record<string, unknown>,
                      auth: integrationMetadata.requiresUserAuth
                        ? {
                            access_token:
                              await messageContext.retrieveCredentials(
                                integrationName
                              ),
                          }
                        : undefined,
                    },
                  });

                handleToolResponse(toolResponse);

                return toolResponse;
              },
            }),
          ] as [string, Tool];
        })
    )
  );

  if (mode === "workflow") {
    // TODO: add system tools (ask question, task data lookup, etc.)
  }

  return integrations;
}
