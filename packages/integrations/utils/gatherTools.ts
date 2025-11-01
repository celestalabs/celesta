import { type IntegrationName, logger } from "@celesta/common";
import { type MessageContext } from "@celesta/session";
import { type ToolSet } from "@celesta/agents/mastra";
import { ExecuteIntegrationHandler } from "../routes/executeIntegration.ts";
import { ListIntegrationsHandler } from "../routes/listIntegrations.ts";
import { createTool, type Tool } from "@celesta/agents/mastra";
import { allIntegrationSchemas } from "../schemas/index.ts";

const log = logger("gatherTools");

export async function gatherTools(
  messageContext: MessageContext<any>,
  systemTools: Partial<Record<string, Tool>> = {}
): Promise<ToolSet> {
  const rawIntegrationsResponse = await ListIntegrationsHandler({
    params: {},
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
            createTool({
              id: toolName,
              description:
                integrationMetadata.description + " - " + action.description,
              inputSchema: allIntegrationSchemas[toolName] as any,
              async execute({ context }) {
                log("Executing tool:", toolName);
                console.log(context);
                const handleToolResponse =
                  messageContext.sendToolInvocationMessage(toolName, context);

                const toolResponse = await ExecuteIntegrationHandler({
                  body: {
                    clientId: messageContext.clientId,
                    integrationName,
                    actionName: action.name,
                    props: context as Record<string, unknown>,
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

                console.log("RESPONSE ", toolResponse);

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

    integrations[fullToolName] = createTool({
      ...toolInstance,
      id: fullToolName,
      execute: async ({ context }) => {
        log("Executing tool:", toolName);

        const handleToolResponse = messageContext.sendToolInvocationMessage(
          fullToolName,
          context
        );
        const toolResponse = (await Promise.resolve(
          toolInstance.execute?.({ context } as any)
        )) as object;

        handleToolResponse(toolResponse);
        return toolResponse;
      },
    });
  }

  return integrations;
}
