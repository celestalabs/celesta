# Celesta Monorepo

**Celesta** is an AI-powered workflow automation system built as a browser extension that converts natural language prompts into actionable workflows using specialized AI agents. The project is organized as a monorepo with three interconnected packages.

---

## 🏗️ Architecture Overview

### **Three Main Packages**

1. **`@celesta/extension`** - Browser Extension (Frontend)
2. **`@celesta/integrations-api`** - REST API Server (Backend)
3. **`@celesta/workflow-agents`** - AI Orchestration Framework (Backend)

---

## 📦 Package Breakdown

### 1. **Extension Package** (`packages/extension`)

**Purpose**: Browser extension providing the user interface

**Technology Stack**:
- **WXT** (Web Extension Toolkit) - Extension framework
- **React 19** - UI components
- **Tailwind CSS** - Styling
- **AI SDK** - Gemini integration for local chat features

**Key Components**:
- **`App.tsx`** - Main UI orchestrator connecting WebSocket to workflow agents
- **`useWebSocket.ts`** - WebSocket client connecting to port 8081 (workflow-agents server)
- **`useOAuth.ts`** - OAuth flow handler communicating with integrations-api
- **`useWorkflowState.ts`** - State management for workflow execution
- **UI Components**: MessagePanel, QuestionPrompt, CredentialRequest, WorkflowInput

**Connection Points**:
- Connects to `ws://localhost:8081` (workflow-agents WebSocket)
- Calls `http://localhost:8080` (integrations-api REST endpoints)

---

### 2. **Integrations API Package** (`packages/integrations-api`)

**Purpose**: REST API server that acts as a bridge between Celesta and third-party services

**Technology Stack**:
- **Express.js** - HTTP server
- **Activepieces** - Pre-built integration implementations
- **Zod** - Schema validation and JSON Schema generation
- **Axios** - OAuth token exchanges

**Key Features**:
- OAuth2 proxy (handles consent flows and token exchange)
- Unified API for executing actions across integrations
- Dynamic JSON Schema generation for tool metadata
- Server-side credential management

**API Endpoints** (all under `/api`):
1. **`POST /executeIntegration`** - Execute actions (send email, create calendar event, etc.)
2. **`GET /generateOAuthRedirectUrl`** - Get OAuth consent screen URL
3. **`POST /generateOAuthAccessToken`** - Exchange auth code for access token
4. **`GET /listIntegrations`** - Get metadata for all available integrations

**Supported Integrations**:
- Gmail (OAuth required)
- Google Calendar (OAuth required)
- Google Drive (OAuth required)
- Google Contacts (OAuth required)
- Web Search via Exa (server-side API key)

**Client SDK**: Exports `createIntegrationApiClient()` for type-safe API calls

**Runs on**: `http://localhost:8080`

---

### 3. **Workflow Agents Package** (`packages/workflow-agents`)

**Purpose**: AI orchestration framework that converts prompts into workflows

**Technology Stack**:
- **AI SDK** (Vercel) - LLM interactions
- **Google Gemini** (gemini-2.5-flash) - AI model
- **WebSocket Server** - Real-time communication with frontend
- **Zod** - Structured LLM outputs

**AI Agent Architecture**:

1. **CoordinationAgent** - "The Brain"
   - Breaks down prompts into subtasks
   - Analyzes completed tasks
   - Determines when workflow is complete

2. **ToolFilterAgent** - "The Selector"
   - Reviews 6 available tools
   - Narrows down to relevant tools for each task
   - Returns empty set for synthesis tasks

3. **ExecutionAgent** - "The Worker"
   - Executes tasks using selected tools
   - Uses AI SDK's `streamText` with multi-step agentic execution
   - Autonomously decides which tools to call
   - Updates ExecutionContext with results

4. **SynthesisAgent** - "The Synthesizer"
   - Combines information from multiple tasks
   - Generates cohesive final responses
   - Uses conversational tone with markdown

5. **BaseAgent** - Abstract base class
   - Common functionality for all agents
   - Gemini model initialization
   - Message pipe access

**Key Components**:
- **ExecutionContext** - Central state management, tracks tasks and results
- **DataRegistry** - Prevents redundant work by tracking collected data
- **MessagePipe System** - Communication layer
  - `IMessagePipe` - Interface
  - `WSMessagePipe` - WebSocket implementation
  - `ConsoleMessagePipe` - CLI implementation for testing

**Dynamic Tools System** (`dynamicTools.ts`):
- Loads tools from integrations-api at runtime
- Converts API endpoints to AI SDK compatible tools
- Wraps tools with logging for UI feedback
- Automatically sends tool invocation/result messages

**Runs on**: WebSocket server at `ws://localhost:8081`

---

## 🔄 How the Packages Connect

### **Data Flow**:

```
User Input (Extension UI)
    ↓
WebSocket to workflow-agents (port 8081)
    ↓
Workflow Agents orchestrate execution
    ↓
dynamicTools.ts calls integrations-api (port 8080)
    ↓
Integrations API executes actions (Gmail, Calendar, etc.)
    ↓
Results flow back through WebSocket
    ↓
Extension UI displays messages and results
```

### **Key Integration Points**:

1. **Extension → Workflow Agents**:
   - WebSocket connection at `ws://localhost:8081`
   - Sends `execute_workflow` messages with prompts
   - Receives status updates, questions, tool calls, results

2. **Extension → Integrations API**:
   - Direct REST calls to `http://localhost:8080`
   - OAuth flow management (`generateOAuthRedirectUrl`, `generateOAuthAccessToken`)
   - Credential management for user authentication

3. **Workflow Agents → Integrations API**:
   - Imports `@celesta/integrations-api/client.js`
   - Calls `listIntegrations()` to load available tools
   - Calls `executeIntegration()` via dynamically created AI SDK tools
   - Tools wrapped with logging to send UI updates

### **Message Flow**:

The system uses a sophisticated message typing system with discriminated unions:

- `status` - Progress updates
- `info` - Informational messages
- `question` - Asks user for input
- `error` - Error messages
- `final` - Final response
- `tool_invocation` - Tool being called (with args)
- `tool_result` - Tool execution result
- `request_credentials` - Needs OAuth token
- `provide_credentials` - OAuth token provided

---

## 🚀 Development Workflow

**Starting the entire system**:
```bash
npm run dev  # Runs all three packages concurrently
```

**Individual packages**:
```bash
npm run dev:extension         # WXT dev server
npm run dev:integrations-api  # Express server (port 8080)
npm run dev:workflow-agents   # WebSocket server (port 8081)
```

**Environment Requirements**:
- `GEMINI_API_KEY` - For workflow-agents (AI model)
- `EXA_API_KEY` - For web search integration
- Google OAuth credentials - For Gmail, Calendar, Drive, Contacts

---

## 💡 Example User Flow

1. User opens browser extension side panel
2. Types: *"Summarize what I have to do today"*
3. Extension sends prompt via WebSocket to workflow-agents
4. CoordinationAgent breaks it into tasks:
   - "Fetch today's calendar events"
   - "Check recent emails for tasks"
5. ToolFilterAgent selects Gmail and Calendar tools
6. ExecutionAgent calls tools via integrations-api
7. If credentials needed, sends `request_credentials` message
8. Extension triggers OAuth flow via integrations-api
9. User authorizes, extension provides token
10. Tools execute, results stored in ExecutionContext
11. SynthesisAgent combines results into cohesive summary
12. Final response displayed in extension UI

---

## 🏛️ Architecture Highlights

This is a well-architected system with clean separation of concerns:
- **Extension** handles UI/UX and user interactions
- **Integrations API** provides a unified abstraction over third-party services
- **Workflow Agents** orchestrates AI-powered task execution

The use of WebSockets for real-time updates and dynamic tool loading makes the system highly extensible and responsive.