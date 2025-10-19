import { Exa } from "exa-js";
import type { WebSearchAuth } from "./types.ts";

export class WebSearchClient {
  private exa: Exa;

  constructor(auth: WebSearchAuth) {
    if (!auth || !auth.access_token) {
      throw new Error("Web Search API key is required");
    }

    // Initialize Exa client with API key
    this.exa = new Exa(auth.access_token);
  }

  /**
   * Get the Exa client instance
   */
  getClient(): Exa {
    return this.exa;
  }
}

/**
 * Factory function to create a Web Search client instance
 */
export function createWebSearchClient(auth: WebSearchAuth): WebSearchClient {
  return new WebSearchClient(auth);
}
