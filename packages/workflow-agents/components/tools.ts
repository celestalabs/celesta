import { z } from "zod";
import { tool } from "ai";

/**
 * Mock tool definitions for various integrations.
 * These don't make actual API calls but simulate realistic behavior.
 */

// Gmail tool
export const gmailTool = tool({
  description: "Search and read emails from Gmail",
  inputSchema: z.object({
    action: z
      .enum(["search", "read", "send"])
      .describe("Action to perform with Gmail"),
    query: z.string().optional().describe("Search query for emails"),
    emailId: z.string().optional().describe("Email ID to read"),
    to: z.string().optional().describe("Recipient email address"),
    subject: z.string().optional().describe("Email subject"),
    body: z.string().optional().describe("Email body"),
  }),
  execute: async (params) => {
    const { action, query, emailId, to, subject, body } = params;
    // Mock implementation
    if (action === "search") {
      return {
        emails: [
          {
            id: "email-1",
            from: "boss@company.com",
            subject: "Q4 Planning Meeting",
            snippet:
              "Please join us for the Q4 planning meeting tomorrow at 2pm...",
            date: "2025-10-16",
          },
          {
            id: "email-2",
            from: "team@company.com",
            subject: "Project Update Required",
            snippet: "We need your input on the latest project deliverables...",
            date: "2025-10-15",
          },
        ],
      };
    } else if (action === "read") {
      return {
        id: emailId,
        from: "boss@company.com",
        subject: "Q4 Planning Meeting",
        body: "Hi team, please join us for the Q4 planning meeting tomorrow at 2pm in Conference Room A. We'll be discussing our goals and strategy for the upcoming quarter.",
        date: "2025-10-16",
      };
    } else if (action === "send") {
      return {
        success: true,
        messageId: "sent-email-123",
        message: `Email sent to ${to}`,
      };
    }
    return { error: "Invalid action" };
  },
});

// Google Calendar tool
export const calendarTool = tool({
  description: "Manage calendar events and check availability",
  inputSchema: z.object({
    action: z
      .enum(["list", "create", "update", "delete"])
      .describe("Action to perform with calendar"),
    startDate: z.string().optional().describe("Start date for event listing"),
    endDate: z.string().optional().describe("End date for event listing"),
    title: z.string().optional().describe("Event title"),
    eventId: z.string().optional().describe("Event ID for update/delete"),
  }),
  execute: async (params) => {
    const { action, startDate, endDate, title, eventId } = params;
    if (action === "list") {
      return {
        events: [
          {
            id: "event-1",
            title: "Q4 Planning Meeting",
            start: "2025-10-17T14:00:00",
            end: "2025-10-17T15:00:00",
            location: "Conference Room A",
          },
          {
            id: "event-2",
            title: "Team Standup",
            start: "2025-10-17T09:00:00",
            end: "2025-10-17T09:30:00",
            location: "Virtual",
          },
          {
            id: "event-3",
            title: "Client Presentation",
            start: "2025-10-18T11:00:00",
            end: "2025-10-18T12:00:00",
            location: "Zoom",
          },
        ],
      };
    } else if (action === "create") {
      return {
        success: true,
        eventId: "new-event-123",
        message: `Event "${title}" created`,
      };
    }
    return { success: true, message: `Action ${action} completed` };
  },
});

// Web Search tool
export const webSearchTool = tool({
  description: "Search the web for information",
  inputSchema: z.object({
    query: z.string().describe("Search query"),
    numResults: z.number().optional().default(5).describe("Number of results"),
  }),
  execute: async (params) => {
    const { query, numResults = 5 } = params;
    return {
      results: [
        {
          title: `Result for: ${query}`,
          url: "https://example.com/result1",
          snippet: `This is a relevant result about ${query}. It contains useful information...`,
        },
        {
          title: `More about ${query}`,
          url: "https://example.com/result2",
          snippet: `Additional context and details regarding ${query}...`,
        },
      ].slice(0, numResults),
    };
  },
});

// YouTube tool
export const youtubeTool = tool({
  description: "Search and get information about YouTube videos",
  inputSchema: z.object({
    action: z.enum(["search", "details"]).describe("Action to perform"),
    query: z.string().optional().describe("Search query for videos"),
    videoId: z.string().optional().describe("Video ID to get details"),
  }),
  execute: async (params) => {
    const { action, query, videoId } = params;
    if (action === "search") {
      return {
        videos: [
          {
            id: "video-1",
            title: `Tutorial: ${query}`,
            channel: "Tech Channel",
            views: "1.2M",
            duration: "15:30",
          },
          {
            id: "video-2",
            title: `${query} - Complete Guide`,
            channel: "Learning Hub",
            views: "850K",
            duration: "22:15",
          },
        ],
      };
    } else if (action === "details") {
      return {
        id: videoId,
        title: "Example Video",
        description: "This is a detailed description of the video...",
        channel: "Example Channel",
        publishedAt: "2025-10-10",
      };
    }
    return { error: "Invalid action" };
  },
});

// Notion tool
export const notionTool = tool({
  description: "Manage Notion pages and databases",
  inputSchema: z.object({
    action: z
      .enum(["search", "read", "create", "update"])
      .describe("Action to perform"),
    query: z.string().optional().describe("Search query"),
    pageId: z.string().optional().describe("Page ID to read/update"),
    title: z.string().optional().describe("Title for new page"),
    content: z.string().optional().describe("Content for page"),
  }),
  execute: async (params) => {
    const { action, query, pageId, title, content } = params;
    if (action === "search") {
      return {
        pages: [
          {
            id: "page-1",
            title: `Project Notes: ${query}`,
            lastEdited: "2025-10-16",
          },
          {
            id: "page-2",
            title: `Meeting Notes - ${query}`,
            lastEdited: "2025-10-15",
          },
        ],
      };
    } else if (action === "create") {
      return {
        success: true,
        pageId: "new-page-123",
        message: `Page "${title}" created`,
      };
    }
    return { success: true, message: `Action ${action} completed` };
  },
});

// Wolfram Alpha tool
export const wolframAlphaTool = tool({
  description:
    "Query Wolfram Alpha for computational knowledge and calculations",
  inputSchema: z.object({
    query: z.string().describe("Query to send to Wolfram Alpha"),
  }),
  execute: async (params) => {
    const { query } = params;
    return {
      result: `Mock calculation result for: ${query}`,
      input: query,
      pods: [
        {
          title: "Result",
          text: "42", // The answer to everything
        },
        {
          title: "Interpretation",
          text: `Interpreting "${query}" as a mathematical expression...`,
        },
      ],
    };
  },
});

// Export all tools as a registry
export const toolRegistry = {
  gmail: gmailTool,
  calendar: calendarTool,
  webSearch: webSearchTool,
  youtube: youtubeTool,
  notion: notionTool,
  wolframAlpha: wolframAlphaTool,
};

export type ToolId = keyof typeof toolRegistry;

// Tool metadata for the ToolFilterAgent
export const toolMetadata: Record<
  ToolId,
  { id: ToolId; name: string; description: string; category: string }
> = {
  gmail: {
    id: "gmail",
    name: "Gmail",
    description: "Search, read, and send emails using Gmail",
    category: "communication",
  },
  calendar: {
    id: "calendar",
    name: "Google Calendar",
    description: "Manage calendar events and check availability",
    category: "scheduling",
  },
  webSearch: {
    id: "webSearch",
    name: "Web Search",
    description: "Search the internet for information",
    category: "information",
  },
  youtube: {
    id: "youtube",
    name: "YouTube",
    description: "Search and get information about YouTube videos",
    category: "media",
  },
  notion: {
    id: "notion",
    name: "Notion",
    description: "Manage Notion pages and databases",
    category: "productivity",
  },
  wolframAlpha: {
    id: "wolframAlpha",
    name: "Wolfram Alpha",
    description: "Perform computational knowledge queries and calculations",
    category: "computation",
  },
};
