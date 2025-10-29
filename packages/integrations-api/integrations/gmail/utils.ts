import { marked } from "marked";

/**
 * Detect if a string contains markdown formatting
 */
export function hasMarkdownFormatting(text: string): boolean {
  // Check for common markdown patterns
  const markdownPatterns = [
    /\*\*[^*]+\*\*/, // Bold: **text**
    /\*[^*]+\*/, // Italic: *text*
    /__[^_]+__/, // Bold: __text__
    /_[^_]+_/, // Italic: _text_
    /\[.+\]\(.+\)/, // Links: [text](url)
    /^#{1,6}\s/m, // Headers: # Header
    /^[-*+]\s/m, // Unordered lists: - item
    /^\d+\.\s/m, // Ordered lists: 1. item
    /^>\s/m, // Blockquotes: > quote
    /```[\s\S]*?```/, // Code blocks: ```code```
    /`[^`]+`/, // Inline code: `code`
  ];

  return markdownPatterns.some((pattern) => pattern.test(text));
}

/**
 * Convert markdown to HTML if needed
 * @param body - The email body content
 * @param isHtml - Whether the body is explicitly set as HTML
 * @returns Object with converted body and isHtml flag
 */
export async function convertMarkdownToHtmlIfNeeded(
  body: string,
  isHtml?: boolean
): Promise<{ body: string; isHtml: boolean | undefined }> {
  // If isHtml is not explicitly set and the body has markdown formatting
  if (isHtml === undefined && hasMarkdownFormatting(body)) {
    const convertedBody = await marked(body, {
      gfm: true, // GitHub Flavored Markdown
      breaks: true, // Convert line breaks to <br>
    });
    return { body: convertedBody, isHtml: true };
  }

  // If explicitly set to HTML but might be markdown, convert it
  if (isHtml && hasMarkdownFormatting(body)) {
    const convertedBody = await marked(body, {
      gfm: true,
      breaks: true,
    });
    return { body: convertedBody, isHtml: true };
  }

  // No conversion needed
  return { body, isHtml };
}
