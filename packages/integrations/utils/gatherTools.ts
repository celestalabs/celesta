import {
  type FullToolSet,
  type IntegrationName,
  isIntegrationName,
  logger,
} from "@celesta/common";
import { wrappedToolExecutor, type MessageContext } from "@celesta/session";
import { createTool, type ToolExecutionContext } from "@mastra/core/tools";
import { z } from "zod";
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
          )(async ({ context }, toolCallId) => {
            log("Executing tool:", toolName, "context:", context);

            return ExecuteIntegrationHandler({
              body: {
                context: {
                  clientId: messageContext.clientId,
                  contextId: messageContext.contextId,
                  toolCallId,
                },
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

    // Add workflow handoff tool (chat only)
    const workflowHandoffTool = createTool({
      id: "system__request_workflow_handoff",
      description:
        "Hand off a complex, multi-step task to the workflow system. Use this when the user's request requires multiple coordinated actions across different integrations or would benefit from autonomous multi-step execution. Examples: 'research X and email me a summary', 'check my calendar and schedule meetings based on availability', 'find all emails from Y and create a report'. Do NOT use for simple single-tool operations. IMPORTANT: Do NOT ask the user for permission or narrate what you're about to do - just call this tool directly when appropriate. For high confidence tasks, the workflow starts automatically.",
      inputSchema: z.object({
        suggestedPrompt: z
          .string()
          .describe(
            "The refined, clear prompt to pass to the workflow system. Should capture the user's full intent."
          ),
        reasoning: z
          .string()
          .describe(
            "Internal reasoning for why this task requires a workflow (not shown to user)."
          ),
        confidence: z
          .enum(["low", "medium", "high"])
          .describe(
            "'high' = auto-starts workflow without asking. 'low'/'medium' = asks user first. Use 'high' when the request clearly needs multi-step orchestration."
          ),
      }),
      execute: async ({ context }) => {
        const { suggestedPrompt, reasoning, confidence } = context as {
          suggestedPrompt: string;
          reasoning: string;
          confidence: "low" | "medium" | "high";
        };

        const accepted = await messageContext.requestWorkflowHandoff({
          content:
            "This task would work better as a workflow with multiple coordinated steps.",
          suggestedPrompt,
          reasoning,
          confidence,
        });

        return accepted
          ? "Workflow started. Briefly confirm to the user (e.g., 'I'm working on that now - you can track progress in the Workflows tab.')."
          : "User declined. Assist them directly with simpler operations.";
      },
    });

    tools.chat["system__request_workflow_handoff"] = workflowHandoffTool;

    return tools;
  }

  return formatIntegrationsIntoTools;
}
