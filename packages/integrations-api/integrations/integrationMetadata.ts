import z, { ZodObject, ZodOptional } from "zod";
import { pieceByName } from "../pieces/pieceData.ts";
import { isPieceName } from "../pieces/pieceName.ts";
import type { SuccessResponse } from "../utils/responseType.ts";
import { isIntegrationName, NonPieceIntegrationName } from "./integrationName.ts";
import { gmailIntegration } from "./gmail/gmailIntegration.ts";
import { calendarIntegration } from "./google-calendar/calendarIntegration.ts";
import { webSearchIntegration } from "./web-search/webSearchIntegration.ts";

export type IntegrationMetadata = {
  name: string;
  description: string;
  logoUrl: string | null;
  requiresUserAuth: boolean;
  actions: { 
    name: string; 
    description: string; 
    props: ZodObject;
    mode: 'chat' | 'workflow' | 'all';
  }[];
};

const nonPieceIntegrationMetadata: Record<
  NonPieceIntegrationName,
  IntegrationMetadata
> = {
  [NonPieceIntegrationName.BROWSER_USE]: {
    name: "Browser Use Agent",
    description: "Interact directly with the user's browser.",
    logoUrl: null,
    requiresUserAuth: false,
    actions: [
      {
        name: "goalOrientedBrowsing",
        description:
          "Launch an agent on the user's browser, to complete a goal, such as information retrieval, task completion, etc.",
        props: z.object({
          goal: z
            .string()
            .describe(
              "What is the goal of the browser use session? Describe in detail."
            ),
          responseType: z
            .string()
            .describe(
              "What information do you want me to return to you? Describe in detail."
            ),
        }),
        mode: 'workflow' as const, // Browser use is complex, workflow-only
      },
    ],
  },
  [NonPieceIntegrationName.GMAIL]: gmailIntegration,
  [NonPieceIntegrationName.GOOGLE_CALENDAR]: calendarIntegration,
  [NonPieceIntegrationName.WEB_SEARCH]: webSearchIntegration,
};

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
        mode: 'workflow' as const, // Default all piece actions to workflow-only
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

