import { executeGmailAction } from './gmail/gmailIntegration.ts';
import { executeCalendarAction } from './google-calendar/calendarIntegration.ts';
import { NonPieceIntegrationName } from './integrationName.ts';

export async function executeCustomIntegration(
  integrationName: NonPieceIntegrationName,
  actionName: string,
  props: object,
  auth: { access_token: string }
): Promise<{ success: true; data: any } | { success: false; error: string }> {
  try {
    let result: any;

    switch (integrationName) {
      case NonPieceIntegrationName.GMAIL:
        result = await executeGmailAction(actionName, props, auth);
        break;
      
      case NonPieceIntegrationName.GOOGLE_CALENDAR:
        result = await executeCalendarAction(actionName, props, auth);
        break;
      
      case NonPieceIntegrationName.BROWSER_USE:
        return {
          success: false,
          error: 'Browser Use integration is not yet implemented in custom executor',
        };

      default:
        return {
          success: false,
          error: `Integration ${integrationName} does not exist in custom integrations.`,
        };
    }

    return { success: true, data: result };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`Error executing ${integrationName}.${actionName}:`, error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}
