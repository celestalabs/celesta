// Auto-generated master index for all integration schemas
// Generated on: 2025-11-01T09:49:26.909Z
// Total schemas: 41

import { z } from "zod";
import { get_page_contentSchema as browser_context__get_page_contentSchema } from "./browser_context/get_page_content.ts";
import { list_open_tabsSchema as browser_context__list_open_tabsSchema } from "./browser_context/list_open_tabs.ts";
import { open_urlSchema as browser_context__open_urlSchema } from "./browser_context/open_url.ts";
import { complete_goal_with_browserSchema as agentic_browsing__complete_goal_with_browserSchema } from "./agentic_browsing/complete_goal_with_browser.ts";
import { send_emailSchema as gmail__send_emailSchema } from "./gmail/send_email.ts";
import { search_messagesSchema as gmail__search_messagesSchema } from "./gmail/search_messages.ts";
import { get_messageSchema as gmail__get_messageSchema } from "./gmail/get_message.ts";
import { list_messagesSchema as gmail__list_messagesSchema } from "./gmail/list_messages.ts";
import { create_draftSchema as gmail__create_draftSchema } from "./gmail/create_draft.ts";
import { search_and_retrieve_messagesSchema as gmail__search_and_retrieve_messagesSchema } from "./gmail/search_and_retrieve_messages.ts";
import { list_and_retrieve_messagesSchema as gmail__list_and_retrieve_messagesSchema } from "./gmail/list_and_retrieve_messages.ts";
import { create_eventSchema as google_calendar__create_eventSchema } from "./google_calendar/create_event.ts";
import { list_eventsSchema as google_calendar__list_eventsSchema } from "./google_calendar/list_events.ts";
import { get_eventSchema as google_calendar__get_eventSchema } from "./google_calendar/get_event.ts";
import { update_eventSchema as google_calendar__update_eventSchema } from "./google_calendar/update_event.ts";
import { delete_eventSchema as google_calendar__delete_eventSchema } from "./google_calendar/delete_event.ts";
import { quick_add_eventSchema as google_calendar__quick_add_eventSchema } from "./google_calendar/quick_add_event.ts";
import { search_webSchema as web_search__search_webSchema } from "./web_search/search_web.ts";
import { find_similarSchema as web_search__find_similarSchema } from "./web_search/find_similar.ts";
import { get_contentsSchema as web_search__get_contentsSchema } from "./web_search/get_contents.ts";
import { answer_questionSchema as web_search__answer_questionSchema } from "./web_search/answer_question.ts";
import { create_new_gdrive_folderSchema as google_drive__create_new_gdrive_folderSchema } from "./google_drive/create_new_gdrive_folder.ts";
import { create_new_gdrive_fileSchema as google_drive__create_new_gdrive_fileSchema } from "./google_drive/create_new_gdrive_file.ts";
import { upload_gdrive_fileSchema as google_drive__upload_gdrive_fileSchema } from "./google_drive/upload_gdrive_file.ts";
import { read_fileSchema as google_drive__read_fileSchema } from "./google_drive/read-file.ts";
import { get_file_or_folder_by_idSchema as google_drive__get_file_or_folder_by_idSchema } from "./google_drive/get-file-or-folder-by-id.ts";
import { list_filesSchema as google_drive__list_filesSchema } from "./google_drive/list-files.ts";
import { search_folderSchema as google_drive__search_folderSchema } from "./google_drive/search-folder.ts";
import { duplicate_fileSchema as google_drive__duplicate_fileSchema } from "./google_drive/duplicate_file.ts";
import { save_file_as_pdfSchema as google_drive__save_file_as_pdfSchema } from "./google_drive/save_file_as_pdf.ts";
import { update_permissionsSchema as google_drive__update_permissionsSchema } from "./google_drive/update_permissions.ts";
import { delete_permissionsSchema as google_drive__delete_permissionsSchema } from "./google_drive/delete_permissions.ts";
import { set_public_accessSchema as google_drive__set_public_accessSchema } from "./google_drive/set_public_access.ts";
import { google_drive_move_fileSchema as google_drive__google_drive_move_fileSchema } from "./google_drive/google-drive-move-file.ts";
import { delete_gdrive_fileSchema as google_drive__delete_gdrive_fileSchema } from "./google_drive/delete_gdrive_file.ts";
import { trash_gdrive_fileSchema as google_drive__trash_gdrive_fileSchema } from "./google_drive/trash_gdrive_file.ts";
import { custom_api_callSchema as google_drive__custom_api_callSchema } from "./google_drive/custom_api_call.ts";
import { add_contactSchema as google_contacts__add_contactSchema } from "./google_contacts/add_contact.ts";
import { update_contactSchema as google_contacts__update_contactSchema } from "./google_contacts/update_contact.ts";
import { search_contactSchema as google_contacts__search_contactSchema } from "./google_contacts/search_contact.ts";
import { custom_api_callSchema as google_contacts__custom_api_callSchema } from "./google_contacts/custom_api_call.ts";

export const allIntegrationSchemas: Record<string, z.ZodTypeAny> = {
  browser_context__get_page_content: browser_context__get_page_contentSchema,
  browser_context__list_open_tabs: browser_context__list_open_tabsSchema,
  browser_context__open_url: browser_context__open_urlSchema,
  agentic_browsing__complete_goal_with_browser:
    agentic_browsing__complete_goal_with_browserSchema,
  gmail__send_email: gmail__send_emailSchema,
  gmail__search_messages: gmail__search_messagesSchema,
  gmail__get_message: gmail__get_messageSchema,
  gmail__list_messages: gmail__list_messagesSchema,
  gmail__create_draft: gmail__create_draftSchema,
  gmail__search_and_retrieve_messages:
    gmail__search_and_retrieve_messagesSchema,
  gmail__list_and_retrieve_messages: gmail__list_and_retrieve_messagesSchema,
  google_calendar__create_event: google_calendar__create_eventSchema,
  google_calendar__list_events: google_calendar__list_eventsSchema,
  google_calendar__get_event: google_calendar__get_eventSchema,
  google_calendar__update_event: google_calendar__update_eventSchema,
  google_calendar__delete_event: google_calendar__delete_eventSchema,
  google_calendar__quick_add_event: google_calendar__quick_add_eventSchema,
  web_search__search_web: web_search__search_webSchema,
  web_search__find_similar: web_search__find_similarSchema,
  web_search__get_contents: web_search__get_contentsSchema,
  web_search__answer_question: web_search__answer_questionSchema,
  google_drive__create_new_gdrive_folder:
    google_drive__create_new_gdrive_folderSchema,
  google_drive__create_new_gdrive_file:
    google_drive__create_new_gdrive_fileSchema,
  google_drive__upload_gdrive_file: google_drive__upload_gdrive_fileSchema,
  "google_drive__read-file": google_drive__read_fileSchema,
  "google_drive__get-file-or-folder-by-id":
    google_drive__get_file_or_folder_by_idSchema,
  "google_drive__list-files": google_drive__list_filesSchema,
  "google_drive__search-folder": google_drive__search_folderSchema,
  google_drive__duplicate_file: google_drive__duplicate_fileSchema,
  google_drive__save_file_as_pdf: google_drive__save_file_as_pdfSchema,
  google_drive__update_permissions: google_drive__update_permissionsSchema,
  google_drive__delete_permissions: google_drive__delete_permissionsSchema,
  google_drive__set_public_access: google_drive__set_public_accessSchema,
  "google_drive__google-drive-move-file":
    google_drive__google_drive_move_fileSchema,
  google_drive__delete_gdrive_file: google_drive__delete_gdrive_fileSchema,
  google_drive__trash_gdrive_file: google_drive__trash_gdrive_fileSchema,
  google_drive__custom_api_call: google_drive__custom_api_callSchema,
  google_contacts__add_contact: google_contacts__add_contactSchema,
  google_contacts__update_contact: google_contacts__update_contactSchema,
  google_contacts__search_contact: google_contacts__search_contactSchema,
  google_contacts__custom_api_call: google_contacts__custom_api_callSchema,
};

export type IntegrationSchemaKey = keyof typeof allIntegrationSchemas;
