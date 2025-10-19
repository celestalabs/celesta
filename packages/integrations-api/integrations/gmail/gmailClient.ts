import { google } from 'googleapis';
import type { GmailAuth } from './gmailIntegration.ts';

export class GmailClient {
  private gmail;
  private auth;

  constructor(accessToken: string) {
    // Create OAuth2 client with the access token
    this.auth = new google.auth.OAuth2();
    this.auth.setCredentials({
      access_token: accessToken,
    });

    // Initialize Gmail API client
    this.gmail = google.gmail({
      version: 'v1',
      auth: this.auth,
    });
  }

  /**
   * Get the authenticated Gmail API instance
   */
  getGmailApi() {
    return this.gmail;
  }

  /**
   * Helper to create a MIME message for email sending
   */
  createMimeMessage(params: {
    to: string | string[];
    subject: string;
    body: string;
    isHtml?: boolean;
    cc?: string | string[];
    bcc?: string | string[];
    from?: string;
  }): string {
    const toAddresses = Array.isArray(params.to) ? params.to.join(', ') : params.to;
    const ccAddresses = params.cc
      ? Array.isArray(params.cc)
        ? params.cc.join(', ')
        : params.cc
      : undefined;
    const bccAddresses = params.bcc
      ? Array.isArray(params.bcc)
        ? params.bcc.join(', ')
        : params.bcc
      : undefined;

    const messageParts = [
      `To: ${toAddresses}`,
      params.from ? `From: ${params.from}` : undefined,
      ccAddresses ? `Cc: ${ccAddresses}` : undefined,
      bccAddresses ? `Bcc: ${bccAddresses}` : undefined,
      `Subject: ${params.subject}`,
      params.isHtml ? 'Content-Type: text/html; charset=utf-8' : 'Content-Type: text/plain; charset=utf-8',
      '',
      params.body,
    ].filter(Boolean);

    return messageParts.join('\r\n');
  }

  /**
   * Encode message to base64url format required by Gmail API
   */
  encodeMessage(message: string): string {
    return Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Decode base64url message from Gmail API
   */
  decodeMessage(encodedMessage: string): string {
    const base64 = encodedMessage.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(base64, 'base64').toString('utf-8');
  }

  /**
   * Extract header value from Gmail message headers
   */
  getHeader(headers: Array<{ name: string; value: string }>, name: string): string | undefined {
    const header = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
    return header?.value;
  }
}

/**
 * Factory function to create a Gmail client instance
 */
export function createGmailClient(auth: GmailAuth): GmailClient {
  return new GmailClient(auth.access_token);
}
