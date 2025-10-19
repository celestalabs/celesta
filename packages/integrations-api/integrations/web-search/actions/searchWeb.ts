import { createWebSearchClient } from '../webSearchClient.ts';
import type { WebSearchAuth, SearchWebParams, SearchResponse } from '../webSearchIntegration.ts';

export async function searchWeb(
  params: SearchWebParams,
  auth: WebSearchAuth
): Promise<SearchResponse> {
  const client = createWebSearchClient(auth);
  const exa = client.getClient();

  // Build options object for Exa
  const options: any = {};
  
  if (params.numResults !== undefined) options.numResults = params.numResults;
  if (params.type) options.type = params.type;
  if (params.category) options.category = params.category;
  if (params.includeDomains) options.includeDomains = params.includeDomains;
  if (params.excludeDomains) options.excludeDomains = params.excludeDomains;
  if (params.startPublishedDate) options.startPublishedDate = params.startPublishedDate;
  if (params.endPublishedDate) options.endPublishedDate = params.endPublishedDate;
  if (params.includeText) options.includeText = params.includeText;
  if (params.excludeText) options.excludeText = params.excludeText;
  
  // Always get content by default (text or highlights)
  if (params.text !== undefined) {
    options.text = params.text;
  } else if (params.highlights !== undefined) {
    options.highlights = params.highlights;
  } else {
    // Default: get text content with reasonable character limit
    options.text = { maxCharacters: 3000 };
  }
  
  // If highlights are specifically requested, add them
  if (params.highlights !== undefined) {
    options.highlights = params.highlights;
  }

  // Use searchAndContents to get results with content
  const response = await exa.searchAndContents(params.query, options);

  return {
    results: response.results,
    autopromptString: response.autopromptString,
  };
}
