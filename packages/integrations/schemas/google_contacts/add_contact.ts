// Auto-generated schema for google_contacts.add_contact
// Generated on: 2025-11-01T09:49:26.908Z

import { z } from "zod";

export const add_contactSchema = z
  .object({
    firstName: z
      .string()
      .describe("First Name(SHORT_TEXT)*: The first name of the contact"),
    middleName: z
      .string()
      .describe("Middle Name(SHORT_TEXT): The middle name of the contact")
      .optional(),
    lastName: z
      .string()
      .describe("Last Name(SHORT_TEXT)*: The last name of the contact"),
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

export type add_contactInput = z.infer<typeof add_contactSchema>;
