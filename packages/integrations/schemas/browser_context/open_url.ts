// Auto-generated schema for browser_context.open_url
// Generated on: 2025-11-01T09:49:26.899Z

import { z } from "zod";

export const open_urlSchema = z.object({ url: z.string() }).strict();

export type open_urlInput = z.infer<typeof open_urlSchema>;
