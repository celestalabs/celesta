import z from 'zod';
import type { IntegrationMetadata } from '../integrationMetadata.ts';
import { searchWeb } from './actions/searchWeb.ts';
import { findSimilar } from './actions/findSimilar.ts';
import { getContents } from './actions/getContents.ts';
import { answerQuestion } from './actions/answerQuestion.ts';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// Auth type for Web Search (uses server-side API key)
export type WebSearchAuth = {
  access_token: string; // Server-injected Exa API key
};

// Search result type from Exa
export interface SearchResult {
  id: string;
  url: string;
  title: string | null;
  publishedDate?: string;
  author?: string;
  text?: string;
  highlights?: string[];
  highlightScores?: number[];
  summary?: string;
}

// Search response from Exa
export interface SearchResponse {
  results: SearchResult[];
  autopromptString?: string | undefined;
}

// Answer response
export interface AnswerResponse {
  answer: string;
  citations: SearchResult[];
  requestId?: string | undefined;
}

// ============================================================================
// ZOD SCHEMAS (for API validation and LLM tool definitions)
// ============================================================================
const searchWebSchema = z.object({
  query: z.string().describe('The search query'),
  numResults: z.number().optional().describe('Number of results to return (max 100)'),
  type: z.enum(['auto', 'neural', 'keyword']).optional().describe('Search type: auto (default), neural (semantic), or keyword (traditional)'),
  category: z.enum(['company', 'research paper', 'news', 'linkedin profile', 'github', 'tweet', 'movie', 'song', 'personal site', 'pdf', 'financial report']).optional().describe('Focus search on specific content category'),
  includeDomains: z.array(z.string()).optional().describe('List of domains to include (e.g., ["nytimes.com", "wsj.com"])'),
  excludeDomains: z.array(z.string()).optional().describe('List of domains to exclude'),
  startPublishedDate: z.string().optional().describe('Filter results published after this date (ISO format: YYYY-MM-DD)'),
  endPublishedDate: z.string().optional().describe('Filter results published before this date (ISO format: YYYY-MM-DD)'),
  includeText: z.array(z.string()).optional().describe('List of strings that must be present in webpage text (currently supports 1 string of up to 5 words)'),
  excludeText: z.array(z.string()).optional().describe('List of strings that must not be present in webpage text (currently supports 1 string of up to 5 words)'),
  text: z.union([
    z.boolean(),
    z.object({
      maxCharacters: z.number().optional().describe('Maximum characters to return from page content'),
      includeHtmlTags: z.boolean().optional().describe('Include HTML tags in content'),
    })
  ]).optional().describe('Include full text content from pages'),
  highlights: z.union([
    z.boolean(),
    z.object({
      query: z.string().optional().describe('Custom query for generating highlights'),
      numSentences: z.number().optional().describe('Number of sentences per highlight'),
      highlightsPerUrl: z.number().optional().describe('Number of highlights per page'),
    })
  ]).optional().describe('Include highlighted excerpts from pages'),
});

const findSimilarSchema = z.object({
  url: z.string().url().describe('The URL to find similar pages for'),
  numResults: z.number().optional().describe('Number of similar results to return'),
  excludeSourceDomain: z.boolean().optional().describe('Exclude results from the same domain as the source URL'),
  includeDomains: z.array(z.string()).optional().describe('List of domains to include'),
  excludeDomains: z.array(z.string()).optional().describe('List of domains to exclude'),
  startPublishedDate: z.string().optional().describe('Filter results published after this date (ISO format: YYYY-MM-DD)'),
  endPublishedDate: z.string().optional().describe('Filter results published before this date (ISO format: YYYY-MM-DD)'),
  category: z.enum(['company', 'research paper', 'news', 'linkedin profile', 'github', 'tweet', 'movie', 'song', 'personal site', 'pdf', 'financial report']).optional().describe('Focus on specific content category'),
});

const getContentsSchema = z.object({
  urls: z.array(z.string().url()).describe('Array of URLs to extract content from'),
  text: z.union([
    z.boolean(),
    z.object({
      maxCharacters: z.number().optional().describe('Maximum characters to return from page content'),
      includeHtmlTags: z.boolean().optional().describe('Include HTML tags in content'),
    })
  ]).optional().describe('Include full text content (default: true)'),
  highlights: z.union([
    z.boolean(),
    z.object({
      query: z.string().optional().describe('Custom query for generating highlights'),
      numSentences: z.number().optional().describe('Number of sentences per highlight'),
      highlightsPerUrl: z.number().optional().describe('Number of highlights per page'),
    })
  ]).optional().describe('Include highlighted excerpts from pages'),
});

const answerQuestionSchema = z.object({
  query: z.string().describe('The question to answer'),
  includeText: z.boolean().optional().describe('Include full text of citation sources'),
});

// ============================================================================
// INFERRED TYPES FROM ZOD SCHEMAS
// ============================================================================

export type SearchWebParams = z.infer<typeof searchWebSchema>;
export type FindSimilarParams = z.infer<typeof findSimilarSchema>;
export type GetContentsParams = z.infer<typeof getContentsSchema>;
export type AnswerQuestionParams = z.infer<typeof answerQuestionSchema>;

// ============================================================================
// INTEGRATION METADATA
// ============================================================================

// Define the Web Search integration
export const webSearchIntegration: IntegrationMetadata = {
  name: 'Web Search',
  description: 'Search the web and extract content using AI-powered neural search',
  logoUrl: 'https://exa.ai/favicon.ico',
  requiresUserAuth: false,
  actions: [
    {
      name: 'search_web',
      description: 'Search the web and retrieve full content from results using AI-powered semantic search',
      props: searchWebSchema,
    },
    {
      name: 'find_similar',
      description: 'Find web pages similar to a given URL',
      props: findSimilarSchema,
    },
    {
      name: 'get_contents',
      description: 'Extract and read content from specific web pages by URL',
      props: getContentsSchema,
    },
    {
      name: 'answer_question',
      description: 'Get a direct answer to a question with citations from the web',
      props: answerQuestionSchema,
    },
  ],
};

// Export action executors
export const webSearchActions = {
  search_web: searchWeb,
  find_similar: findSimilar,
  get_contents: getContents,
  answer_question: answerQuestion,
} as const;

// Type-safe action executor
export async function executeWebSearchAction(
  actionName: string,
  props: object,
  auth: WebSearchAuth
): Promise<any> {
  const action = webSearchActions[actionName as keyof typeof webSearchActions];
  if (!action) {
    throw new Error(`Unknown Web Search action: ${actionName}`);
  }
  
  return await action(props as any, auth);
}
