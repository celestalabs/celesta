import { createWebSearchClient } from "../webSearchClient.ts";
import type {
  WebSearchAuth,
  FindSimilarParams,
  SearchResponse,
} from "../webSearchIntegration.ts";

export async function findSimilar(
  params: FindSimilarParams,
  auth: WebSearchAuth
): Promise<SearchResponse> {
  const client = createWebSearchClient(auth);
  const exa = client.getClient();

  // Build options object for Exa
  const options: any = {};

  if (params.numResults !== undefined) options.numResults = params.numResults;
  if (params.excludeSourceDomain !== undefined)
    options.excludeSourceDomain = params.excludeSourceDomain;
  if (params.includeDomains) options.includeDomains = params.includeDomains;
  if (params.excludeDomains) options.excludeDomains = params.excludeDomains;
  if (params.startPublishedDate)
    options.startPublishedDate = params.startPublishedDate;
  if (params.endPublishedDate)
    options.endPublishedDate = params.endPublishedDate;
  if (params.category) options.category = params.category;

  // Use findSimilar to get similar pages (links only)
  const response = await exa.findSimilar(params.url, options);

  return {
    results: response.results,
  };
}
