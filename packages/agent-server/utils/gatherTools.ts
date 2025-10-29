import { jsonSchema, tool, Tool, ToolSet } from "ai";
import { sessionManager } from "../components/sessionManager.js";
import { MessageContext } from "../components/messageContext.js";
import { integrationsClient } from "../components/integrationsClient.js";
import { IntegrationName } from "@celesta/integrations-api/integrations/integrationName.js";

export function gatherTools(
  messageContext: MessageContext,
  mode: "workflow" | "chat",
  systemTools: Partial<Record<string, Tool>> = {}
): ToolSet {
  const integrations = Object.fromEntries(
    Object.entries(
      sessionManager.tools.get(messageContext.clientId) || {}
    ).flatMap(([integrationName, integrationMetadata]) =>
      integrationMetadata.actions
        .filter((a) => a.mode === mode || a.mode === "all")
        .map((action) => {
          const toolName = `${integrationName}__${action.name}`;
          return [
            toolName,
            tool({
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
                                integrationName as IntegrationName
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

  for (const [toolName, toolInstance] of Object.entries(systemTools)) {
    const fullToolName = `system__${toolName}`;
    if (toolInstance == null) continue;

    integrations[fullToolName] = tool({
      ...toolInstance,
      execute: async (input, context) => {
        const handleToolResponse = messageContext.sendToolInvocationMessage(
          fullToolName,
          input
        );
        const toolResponse = await Promise.resolve(
          toolInstance.execute?.(input, context)
        );
        handleToolResponse(toolResponse);
        return toolResponse;
      },
    });
  }

  return integrations;
}
