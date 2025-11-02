import {
  type FullToolSet,
  type IntegrationName,
  isIntegrationName,
  logger,
} from "@celesta/common";
import { wrappedToolExecutor, type MessageContext } from "@celesta/session";
import { createTool, type ToolExecutionContext } from "@mastra/core/tools";
import { ExecuteIntegrationHandler } from "../routes/executeIntegration.ts";
import { ListIntegrationsHandler } from "../routes/listIntegrations.ts";

const log = logger("gatherTools");

export async function gatherTools(): Promise<
  (messageContext: MessageContext) => FullToolSet
> {
  const rawIntegrationsResponse = await ListIntegrationsHandler({});

  function formatIntegrationsIntoTools(messageContext: MessageContext) {
    if (!rawIntegrationsResponse.success) {
      log("Failed to list integrations:", rawIntegrationsResponse.error);
      return { chat: {}, workflow: {}, browser: {} };
    }

    const tools = { chat: {}, workflow: {}, browser: {} } as FullToolSet;

    for (const integrationName in rawIntegrationsResponse.integrations) {
      if (!isIntegrationName(integrationName)) {
        continue;
      }

      const integrationMetadata =
        rawIntegrationsResponse.integrations[integrationName];

      for (const action of integrationMetadata.actions) {
        const toolName = `${integrationName}__${action.name}`;
        const toolInstance = createTool({
          id: toolName,
          description:
            integrationMetadata.description + " - " + action.description,
          inputSchema: action.props as any,
          execute: wrappedToolExecutor<ToolExecutionContext, object>(
            messageContext,
            toolName
          )(async ({ context }) => {
            log("Executing tool:", toolName, "context:", context);

            return ExecuteIntegrationHandler({
              body: {
                clientId: messageContext.clientId,
                integrationName,
                actionName: action.name,
                props: context as Record<string, unknown>,
                auth: integrationMetadata.requiresUserAuth
                  ? {
                      access_token: await messageContext.retrieveCredentials(
                        integrationName as IntegrationName
                      ),
                    }
                  : undefined,
              },
            });
          }),
        });
        for (const mode of action.mode) {
          tools[mode][toolName] = toolInstance;
        }
      }
    }

    return tools;
  }

  return formatIntegrationsIntoTools;
}
