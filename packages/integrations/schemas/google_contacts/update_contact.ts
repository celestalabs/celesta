// Auto-generated schema for google_contacts.update_contact
// Generated on: 2025-11-01T09:49:26.908Z

import { z } from "zod";

export const update_contactSchema = z
  .object({
    resourceName: z
      .string()
      .describe(
        "Resource Name(SHORT_TEXT)*: The resource name for the person, assigned by the server. An ASCII string in the form of people/{person_id}."
      ),
    etag: z
      .string()
      .describe(
        "Etag(SHORT_TEXT)*: The `etag` ensures contact updates only apply if the contact hasn't changed since last retrieved."
      ),
    updatePersonFields: z
      .array(z.any())
      .describe(
        "Update Field Mask(STATIC_MULTI_SELECT_DROPDOWN)*: A field mask to restrict which fields on the person are updated."
      ),
    firstName: z
      .string()
      .describe("First Name(SHORT_TEXT): The first name of the contact")
      .optional(),
    middleName: z
      .string()
      .describe("Middle Name(SHORT_TEXT): The middle name of the contact")
      .optional(),
    lastName: z
      .string()
      .describe("Last Name(SHORT_TEXT): The last name of the contact")
      .optional(),
    jobTitle: z
      .string()
      .describe("Job Title(SHORT_TEXT): The job title of the contact")
      .optional(),
    company: z
      .string()
      .describe("Company(SHORT_TEXT): The company of the contact")
      .optional(),
    email: z
      .string()
      .describe("Email(SHORT_TEXT): The email address of the contact")
      .optional(),
    phoneNumber: z
      .string()
      .describe("Phone Number(SHORT_TEXT): The phone number of the contact")
      .optional(),
  })
  .strict();

export type update_contactInput = z.infer<typeof update_contactSchema>;
