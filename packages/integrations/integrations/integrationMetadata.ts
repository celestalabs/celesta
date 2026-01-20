import {
  NonPieceIntegrationName,
  isPieceName,
  isIntegrationName,
  type ToolMode,
  type WorkflowId,
} from "@celesta/common";
import z, { ZodObject, ZodOptional } from "zod";
import { pieceByName } from "../pieces/pieceData.ts";
import type { SuccessResponse } from "../utils/responseType.ts";
import { gmailIntegration } from "./gmail/gmailIntegration.ts";
import { calendarIntegration } from "./google-calendar/calendarIntegration.ts";
import { webSearchIntegration } from "./web-search/webSearchIntegration.ts";

export type ClientContext = {
  clientId: ClientId;
  contextId: ContextId;
  toolCallId: ToolCallId;
  workflowId?: WorkflowId; // Present when executing within a workflow
};

export type IntegrationMetadata = {
  name: string;
  description: string;
  logoUrl: string | null;
  requiresUserAuth: boolean;
  actions: {
    name: string;
    description: string;
    props: ZodObject;
    mode: ToolMode[];
  }[];
};

const nonPieceIntegrationMetadata = {
  [NonPieceIntegrationName.BROWSER_CONTEXT]: {
    name: "Browser Context",
    description:
      "Read and open information through the user's browsing context, such as their tabs and page content.",
    logoUrl: null,
    requiresUserAuth: false,
    actions: [
      {
        name: "get_page_content",
        description:
          "Extract the page's content as HTML. IMPORTANT: You must first call 'list_open_tabs' to get the exact tab titles, then pass the exact title string here. Do NOT pass generic terms like 'current', 'active', or 'this tab' - use the actual title from the tab list.",
        props: z.object({ titleOfOpenTab: z.string().describe("The EXACT title of the tab as returned by list_open_tabs. Must be an exact string match - do not use generic terms like 'current' or 'active'.") }),
        mode: ["browser", "chat", "workflow"],
      },
      {
        name: "list_open_tabs",
        description: "List all open tabs with their exact title, URL, and whether they are the active/current tab (active: true). ALWAYS call this first before using get_page_content to get the exact tab titles.",
        props: z.object({}),
        mode: ["browser", "chat", "workflow"],
      },
      {
        name: "open_url",
        description:
          "Open a URL in a new tab. Useful for navigating to a specific page for further interactions.",
        props: z.object({ url: z.string() }),
        mode: ["browser", "chat", "workflow"],
      },
    ],
  },
  [NonPieceIntegrationName.AGENTIC_BROWSING]: {
    name: "Agentic Browsing",
    description:
      "Directly control the user's browser to complete goals or actions",
    logoUrl: null,
    requiresUserAuth: false,
    actions: [
      {
        name: "complete_goal_with_browser",
        description: "Use the user's browser to complete an actionable goal.",
        props: z.object({
          goalDescription: z
            .string()
            .describe(
              "What is the goal which needs to be completed? Detail as much as possible."
            ),
        }),
        mode: ["workflow"],
      },
    ],
  },
  [NonPieceIntegrationName.GMAIL]: gmailIntegration,
  [NonPieceIntegrationName.GOOGLE_CALENDAR]: calendarIntegration,
  [NonPieceIntegrationName.WEB_SEARCH]: webSearchIntegration,
} as const satisfies Record<NonPieceIntegrationName, IntegrationMetadata>;

export function readIntegrationMetadata(
  integrationName: string
): SuccessResponse<IntegrationMetadata> {
  if (!isIntegrationName(integrationName)) {
    return { success: false, error: "Invalid integration" };
  }

  // Piece name
  if (isPieceName(integrationName)) {
    const piece = pieceByName[integrationName];
    const name = piece.displayName;
    const description = piece.description;
    const actionData: IntegrationMetadata["actions"] = [];
    const logoUrl = piece.logoUrl;

    for (let action of Object.values(piece.actions())) {
      const zodProps = z.object(
        Object.fromEntries(
          Object.entries(action.props).map(([key, value]) => {
            // Map each PropertyType to a corresponding Zod schema
            const baseSchema = (() => {
              // String types
              if (
                value.type === "SHORT_TEXT" ||
                value.type === "COLOR" ||
                value.type === "DATE_TIME" ||
                value.type === "LONG_TEXT" ||
                value.type === "MARKDOWN"
              ) {
                return z.string();
              }
              // Number type
              else if (value.type === "NUMBER") {
                return z.number();
              }
              // Boolean type
              else if (value.type === "CHECKBOX") {
                return z.boolean();
              }
              // Array types
              else if (
                value.type === "ARRAY" ||
                value.type === "MULTI_SELECT_DROPDOWN" ||
                value.type === "STATIC_MULTI_SELECT_DROPDOWN"
              ) {
                return z.array(z.any());
              }
              // Object type
              else if (value.type === "OBJECT") {
                return z.record(z.string(), z.any());
              }
              // Dropdown types with static options
              else if (
                value.type === "STATIC_DROPDOWN" &&
                value.options &&
                Array.isArray(value.options.options)
              ) {
                try {
                  // Try to create an enum if all options are strings
                  const stringValues = value.options.options
                    .map((opt: any) => opt.value)
                    .filter((val: any) => typeof val === "string");

                  if (stringValues.length > 0) {
                    return z.enum([
                      stringValues[0] ?? "",
                      ...stringValues.slice(1),
                    ]);
                  }
                } catch (e) {
                  console.warn("Failed to create enum schema:", e);
                }
              }

              return z.any();
            })();

            let schema: typeof baseSchema | ZodOptional<typeof baseSchema> =
              baseSchema.describe(
                `${value.displayName}(${value.type})${value.required ? "*" : ""}${value.description ? `: ${value.description}` : ""}`
              );
            schema = value.required ? schema : schema.optional();

            return [key, schema];
          })
        )
      );

      actionData.push({
        name: action.name,
        description: action.description,
        props: zodProps,
        mode: ["chat", "workflow"],
      });
    }

    return {
      success: true,
      name,
      description,
      logoUrl,
      requiresUserAuth: true, // Activepieces integrations require OAuth
      actions: actionData,
    };
  }

  // non piece integration
  return { success: true, ...nonPieceIntegrationMetadata[integrationName] };
}
export { isIntegrationName };
