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
 * Higher-order function that wraps a tool execution function with logging.
 * Automatically sends tool invocation and result messages to the UI.
 */
function wrapToolWithLogging<TParams = any, TResult = any>(
  toolName: string,
  executeFn: (params: TParams) => Promise<TResult>,
  messagePipe: IMessagePipe
): (params: TParams) => Promise<TResult> {
  return async (params: TParams): Promise<TResult> => {
    // Generate unique tool call ID
    const toolCallId = `tool_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Send tool invocation message BEFORE execution
    messagePipe.sendToolInvocation(
      toolCallId,
      toolName,
      params,
      "ExecutionAgent"
    );

    try {
      // Execute the tool
      const result = await executeFn(params);

      // Send tool result message AFTER execution
      messagePipe.sendToolResult(
        toolCallId,
        toolName,
        result,
        "ExecutionAgent"
      );

      return result;
    } catch (error) {
      // Handle errors and send error result
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorResult = {
        error: true,
        message: `Tool execution error: ${errorMsg}`,
      } as TResult;

      // Send error result
      messagePipe.sendToolResult(
        toolCallId,
        toolName,
        errorResult,
        "ExecutionAgent"
      );

      return errorResult;
    }
  };
}

/**
 * Loads tools dynamically from the integrations API and converts them
 * to AI SDK compatible tools that execute via the API client.
 */
export async function loadToolsFromAPI(
  apiBaseUrl: string,
  messagePipe: IMessagePipe,
  executionContext?: any
): Promise<{
  tools: ToolSet;
  metadata: ToolMetadata[];
  integrationMetadata: Record<
    IntegrationName,
    Omit<IntegrationMetadata, "actions">
  >;
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

        // Create AI SDK tool with wrapped execution
        tools[toolName] = tool({
          description: `${integration.name}: ${action.description}`,
          inputSchema: jsonSchema(action.props),
          execute: wrapToolWithLogging(
            toolName,
            async (params) => {
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
            },
            messagePipe
          ),
        });
      }
    }

    // Add system tool: askQuestion
    // This allows agents to ask clarifying questions when needed
    tools["system__askQuestion"] = tool({
      description:
        "Ask the user a clarifying question and wait for their response. Use this when you need critical information that cannot be reasonably assumed, especially before performing risky operations like sending emails or creating calendar events.",
      inputSchema: jsonSchema({
        type: "object",
        properties: {
          question: {
            type: "string",
            description:
              "The question to ask the user. Be specific and clear about what information you need and why.",
          },
        },
        required: ["question"],
      }),
      execute: wrapToolWithLogging(
        "system__askQuestion",
        async (params: { question: string }) => {
          const answer = await messagePipe.ask(
            params.question,
            "ExecutionAgent"
          );
          return {
            success: true,
            answer,
          };
        },
        messagePipe
      ),
    });

    // Add metadata for askQuestion tool
    metadata.push({
      integrationName: "system" as IntegrationName,
      actionName: "askQuestion",
      description:
        "Ask the user a clarifying question when critical information is needed",
      displayName: "System - Ask Question",
    });

    // Add system tool: getTaskData
    // Allows agents to retrieve data from completed tasks
    if (executionContext) {
      tools["system__getTaskData"] = tool({
        description:
          "Retrieve stored data from a completed task using its task slug or ID. Use this to access data collected in previous tasks (e.g., emails, calendar events, etc.).",
        inputSchema: jsonSchema({
          type: "object",
          properties: {
            taskIdentifier: {
              type: "string",
              description:
                "The task slug (e.g., 'email-query-1') or task ID to retrieve data from",
            },
          },
          required: ["taskIdentifier"],
        }),
        execute: wrapToolWithLogging(
          "system__getTaskData",
          async (params: { taskIdentifier: string }) => {
            const data = executionContext
              .getDataRegistry()
              .get(params.taskIdentifier);
            if (!data) {
              return {
                success: false,
                error: `No data found for task: ${params.taskIdentifier}`,
              };
            }
            return {
              success: true,
              data,
            };
          },
          messagePipe
        ),
      });

      // Add metadata for getTaskData tool
      metadata.push({
        integrationName: "system" as IntegrationName,
        actionName: "getTaskData",
        description: "Retrieve data from a completed task by its slug or ID",
        displayName: "System - Get Task Data",
      });
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
