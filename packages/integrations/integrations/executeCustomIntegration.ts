import { browserManager } from "@celesta/browser";
import {
  type BrowserContextAction,
  NonPieceIntegrationName,
} from "@celesta/common";
import { executeGmailAction } from "./gmail/gmailIntegration.ts";
import { executeCalendarAction } from "./google-calendar/calendarIntegration.ts";
import type { ClientContext } from "./integrationMetadata.ts";
import { executeWebSearchAction } from "./web-search/webSearchIntegration.ts";

export async function executeCustomIntegration(
  integrationName: NonPieceIntegrationName,
  actionName: string,
  props: object,
  auth: { access_token: string } | null,
  context: ClientContext
): Promise<{ success: true; data: any } | { success: false; error: string }> {
  try {
    let result: any;

    switch (integrationName) {
      case NonPieceIntegrationName.GMAIL: {
        if (!auth) {
          return { success: false, error: "Gmail requires authentication" };
        }
        result = await executeGmailAction(actionName, props, auth);
        break;
      }

      case NonPieceIntegrationName.GOOGLE_CALENDAR: {
        if (!auth) {
          return {
            success: false,
            error: "Google Calendar requires authentication",
          };
        }
        result = await executeCalendarAction(actionName, props, auth);
        break;
      }

      case NonPieceIntegrationName.WEB_SEARCH: {
        if (!auth) {
          return {
            success: false,
            error:
              "Exa Web Search requires authentication. This is an internal issue with the server.",
          };
        }
        result = await executeWebSearchAction(actionName, props, auth);
        break;
      }

      case NonPieceIntegrationName.BROWSER_CONTEXT: {
        let action: BrowserContextAction | null = null;

        switch (actionName) {
          case "get_page_content": {
            action = {
              type: "GET_PAGE_CONTENT",
              titleOfOpenTab: (props as any).titleOfOpenTab,
            };
            break;
          }
          case "list_open_tabs": {
            action = { type: "LIST_OPEN_TABS" };
            break;
          }
          case "open_url": {
            action = { type: "OPEN_URL", url: (props as any).url };
            break;
          }
          default: {
            return {
              success: false,
              error: `Unknown action ${actionName} for Browser Use integration.`,
            };
          }
        }

        try {
          const result = await browserManager.executeAction(
            context.clientId,
            action
          );
          return { success: true, data: result };
        } catch (error) {
          return {
            success: false,
            error: `Error executing Browser Use action: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          };
        }
      }

      case NonPieceIntegrationName.AGENTIC_BROWSING: {
        return browserManager.initiateBrowserAgent(
          context.clientId,
          context.contextId,
          context.toolCallId,
          (props as any).goalDescription,
          {
            workflowId: context.workflowId,
          }
        );
      }

      default: {
        return {
          success: false,
          error: `Integration ${integrationName} does not exist in custom integrations.`,
        };
      }
    }

    return { success: true, data: result };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error(`Error executing ${integrationName}.${actionName}:`, error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}
