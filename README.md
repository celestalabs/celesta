# Celesta monorepo

Holds all packages for the Celesta project.

## To-do items

### Problem Tracker
- Enable and support email verification when making Supabase account.
- Everything is stored in-memory! (Bad!)

### Features

- Agent system refinement.
  - Convert workflow agents to Mastra. (May need to leave browser agent as-is due to `@google/genai` dependency.)
  - ~~Refine prompts for agents to make them call tools more greedily, reduce repeat task execution, etc.~~
- Human in the loop.
  - For the moment, we can manually implement this at the tool level. (Allow all reads and creates, probably want intervention for modifications and sends.)
  - Use this to support user intervention for browser use. (Right now, auto-allows everything; bad + against Google TOS.)
  - Implement a complementary notification-style system on the frontend. 
- User authentication and profiles.
  - Persistent memory. (Need to think through this.)
  - Integration marketplace. (Opt into/out of various tools.)
- Error handling.
  - Error boundaries, graceful failure handling, and auto-retry where possible.
- Add many more integrations!
  - Rich-text tools should be wrapped such that they can accept Markdown.
- Generalized "Object" construct // Supercharged message box.
  - Tag tabs, workflows, and ideally anything (Docs, Etc.) as context when starting workflows or sending chat messages.

## Packages

- `@celesta/agents` holds agents which extend the `BaseAgent` which can be invoked by `MessagePipes` at lifecycle points.
- `@celesta/browser` holds routing logic to execute "browser context" integrations (trivial read or open-tab operations) or initialize goal-oriented browser use.
- `@celesta/common` holds shared types, base classes, and utils.
- `@celesta/extension` is the WXT-powered React frontend for the sidepanel (and possibly newtab) UI.
- `@celesta/integrations` holds the logic to read and execute integrations (tools), as well as manage their authentication.
- `@celesta/server` handles starting WS and HTTP servers, setting up clients, and handing off incoming messages.
- `@celesta/session` holds the `sessionManager` singleton that manages client-level context, as well as the `MessagePipe` class which abstracts message sending and receiving at the context (chat, workflow, browser) level.