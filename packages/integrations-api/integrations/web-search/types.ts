// Auth type for Web Search (uses server-side API key)
export type WebSearchAuth = {
  access_token: string; // Server-injected Exa API key
} | null;

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

// Search parameters
export interface SearchWebParams {
  query: string;
  numResults?: number;
  type?: 'auto' | 'neural' | 'keyword';
  category?: 'company' | 'research paper' | 'news' | 'linkedin profile' | 'github' | 'tweet' | 'movie' | 'song' | 'personal site' | 'pdf' | 'financial report';
  includeDomains?: string[];
  excludeDomains?: string[];
  startPublishedDate?: string;
  endPublishedDate?: string;
  includeText?: string[];
  excludeText?: string[];
  text?: boolean | { maxCharacters?: number; includeHtmlTags?: boolean };
  highlights?: boolean | { query?: string; numSentences?: number; highlightsPerUrl?: number };
}

// Find similar parameters
export interface FindSimilarParams {
  url: string;
  numResults?: number;
  excludeSourceDomain?: boolean;
  includeDomains?: string[];
  excludeDomains?: string[];
  startPublishedDate?: string;
  endPublishedDate?: string;
  category?: 'company' | 'research paper' | 'news' | 'linkedin profile' | 'github' | 'tweet' | 'movie' | 'song' | 'personal site' | 'pdf' | 'financial report';
}

// Get contents parameters
export interface GetContentsParams {
  urls: string[];
  text?: boolean | { maxCharacters?: number; includeHtmlTags?: boolean };
  highlights?: boolean | { query?: string; numSentences?: number; highlightsPerUrl?: number };
}

// Answer question parameters
export interface AnswerQuestionParams {
  query: string;
  includeText?: boolean;
}

// Answer response
export interface AnswerResponse {
  answer: string;
  citations: SearchResult[];
  requestId?: string | undefined;
}
