import { tool, jsonSchema, ToolSet } from "ai";
import { createIntegrationApiClient } from "@celesta/integrations-api/client.js";
import type { IntegrationName } from "@celesta/integrations-api/integrations/integrationName.js";
import type { IntegrationMetadata } from "@celesta/integrations-api/integrations/integrationMetadata.js";
import type { IMessagePipe } from "../io/IMessagePipe.js";

export interface ToolMetadata {
  integrationName: IntegrationName;
  actionName: string;
  description: string;
  displayName: string;
}

/**
 * Loads tools dynamically from the integrations API and converts them
 * to AI SDK compatible tools that execute via the API client.
 */
export async function loadToolsFromAPI(
  apiBaseUrl: string,
  messagePipe: IMessagePipe
): Promise<{
  tools: ToolSet;
  metadata: ToolMetadata[];
  integrationMetadata: Record<IntegrationName, Omit<IntegrationMetadata, "actions">>;
}> {
  const apiClient = createIntegrationApiClient(apiBaseUrl);
  const tools: ToolSet = {};
  const metadata: ToolMetadata[] = [];
  const integrationMetadata: Record<
    IntegrationName,
    Omit<IntegrationMetadata, "actions">
  > = {} as any;

  try {
    const response = await apiClient.listIntegrations({});

    if (!response.success) {
      throw new Error(`Failed to list integrations: ${response.error}`);
    }

    for (const [integrationName, integration] of Object.entries(
      response.integrations
    )) {
      // Store integration metadata (without actions)
      integrationMetadata[integrationName as IntegrationName] = {
        name: integration.name,
        description: integration.description,
        logoUrl: integration.logoUrl,
        requiresUserAuth: integration.requiresUserAuth,
      };

      for (const action of integration.actions) {
        const toolName = `${integrationName}__${action.name}`;

        // Store metadata for CoordinationAgent
        metadata.push({
          integrationName: integrationName as IntegrationName,
          actionName: action.name,
          description: action.description,
          displayName: `${integration.name} - ${action.name}`,
        });

        // Create AI SDK tool
        tools[toolName] = tool({
          description: `${integration.name}: ${action.description}`,
          inputSchema: jsonSchema(action.props),
          async execute(params) {
            try {
              // Only request credentials if integration requires user auth
              let auth: { access_token: string } | undefined;
              
              if (integration.requiresUserAuth) {
                const accessToken = await messagePipe.requestCredentials(
                  integrationName as IntegrationName
                );
                auth = { access_token: accessToken };
              }

              // Execute the integration action
              const result = await apiClient.executeIntegration({
                body: {
                  integrationName: integrationName as IntegrationName,
                  actionName: action.name,
                  props: params,
                  ...(auth && { auth }),
                },
              });

              if (result.success) {
                return result.result;
              } else {
                return {
                  error: true,
                  message: `Integration execution failed: ${result.error}`,
                  code: result.code,
                };
              }
            } catch (error) {
              const errorMsg =
                error instanceof Error ? error.message : String(error);
              return {
                error: true,
                message: `Tool execution error: ${errorMsg}`,
              };
            }
          },
        });
      }
    }

    return { tools, metadata, integrationMetadata };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load tools from API: ${errorMsg}`);
  }
}

/**
 * Format tool metadata for inclusion in agent prompts
 */
export function formatToolMetadataForPrompt(metadata: ToolMetadata[]): string {
  const groupedByIntegration = metadata.reduce(
    (acc, tool) => {
      if (!acc[tool.integrationName]) {
        acc[tool.integrationName] = [];
      }
      acc[tool.integrationName].push(tool);
      return acc;
    },
    {} as Record<IntegrationName, ToolMetadata[]>
  );

  let output = "Available Tools:\n\n";

  for (const [integration, actions] of Object.entries(groupedByIntegration)) {
    output += `${integration}:\n`;
    for (const action of actions) {
      const toolName = `${action.integrationName}__${action.actionName}`;
      output += `  - ${toolName}: ${action.description}\n`;
    }
    output += "\n";
  }

  return output;
}
