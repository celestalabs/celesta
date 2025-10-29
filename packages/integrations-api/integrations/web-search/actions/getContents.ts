import { createWebSearchClient } from "../webSearchClient.ts";
import type {
  WebSearchAuth,
  GetContentsParams,
  SearchResponse,
} from "../webSearchIntegration.ts";

export async function getContents(
  params: GetContentsParams,
  auth: WebSearchAuth
): Promise<SearchResponse> {
  const client = createWebSearchClient(auth);
  const exa = client.getClient();

  // Build options object for Exa
  const options: any = {};

  // Default to getting text if nothing specified
  if (params.text !== undefined) {
    options.text = params.text;
  } else if (params.highlights !== undefined) {
    options.highlights = params.highlights;
  } else {
    options.text = true; // Default behavior
  }

  // If highlights are specifically requested, add them
  if (params.highlights !== undefined) {
    options.highlights = params.highlights;
  }

  // Use getContents to extract content from URLs
  const response = await exa.getContents(params.urls, options);

  return {
    results: response.results,
  };
}
