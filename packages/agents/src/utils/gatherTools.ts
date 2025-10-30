import { IntegrationName, logger } from "@celesta/common";
import {
  ExecuteIntegrationHandler,
  ListIntegrationsHandler,
} from "@celesta/integrations";
import { MessageContext } from "@celesta/session";
import { jsonSchema, tool, Tool, ToolSet } from "ai";

const log = logger("gatherTools");

export async function gatherTools(
  messageContext: MessageContext,
  mode: "workflow" | "chat",
  systemTools: Partial<Record<string, Tool>> = {}
): Promise<ToolSet> {
  const rawIntegrationsResponse = await ListIntegrationsHandler({
    params: { mode },
  });

  if (!rawIntegrationsResponse.success) {
    log("Failed to list integrations:", rawIntegrationsResponse.error);
    return {};
  }

  const integrations = Object.fromEntries(
    Object.entries(rawIntegrationsResponse.integrations).flatMap(
      ([integrationName, integrationMetadata]) =>
        integrationMetadata.actions.map((action) => {
          const toolName = `${integrationName}__${action.name}`;
          return [
            toolName,
            tool({
              description:
                integrationMetadata.description + " - " + action.description,
              inputSchema: jsonSchema(action.props),
              async execute(input) {
                log("Executing tool:", toolName);
                const handleToolResponse =
                  messageContext.sendToolInvocationMessage(toolName, input);

                const toolResponse = await ExecuteIntegrationHandler({
                  body: {
                    clientId: messageContext.clientId,
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
        log("Executing tool:", toolName);

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
