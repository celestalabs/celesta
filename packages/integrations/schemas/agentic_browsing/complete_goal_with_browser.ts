// Auto-generated schema for agentic_browsing.complete_goal_with_browser
// Generated on: 2025-11-01T09:49:26.899Z

import { z } from "zod";

export const complete_goal_with_browserSchema = z
  .object({
    goalDescription: z
      .string()
      .describe(
        "What is the goal which needs to be completed? Detail as much as possible."
      ),
  })
  .strict();

export type complete_goal_with_browserInput = z.infer<
  typeof complete_goal_with_browserSchema
>;
