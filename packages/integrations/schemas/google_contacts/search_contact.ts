// Auto-generated schema for google_contacts.search_contact
// Generated on: 2025-11-01T09:49:26.908Z

import { z } from "zod";

export const search_contactSchema = z
  .object({
    query: z
      .string()
      .describe(
        'Query(SHORT_TEXT)*: The plain-text query for the request.The query is used to match prefix phrases of the fields on a person. For example, a person with name "foo name" matches queries such as "f", "fo", "foo", "foo n", "nam", etc., but not "oo n".'
      ),
    readMask: z
      .array(z.any())
      .describe(
        "Read Mask(STATIC_MULTI_SELECT_DROPDOWN)*: A field mask to restrict which fields on each person are returned."
      ),
    pageSize: z
      .number()
      .describe(
        "Page Size(NUMBER): The number of results to return. Maximum 30."
      )
      .optional(),
  })
  .strict();

export type search_contactInput = z.infer<typeof search_contactSchema>;
