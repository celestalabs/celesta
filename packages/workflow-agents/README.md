# @celesta/playground

A next-generation **AI workflow orchestration framework** that converts natural language prompts into actionable sequential workflows using specialized AI agents.

**Example**: *"Summarize what I have to do today"* → System fetches emails, checks calendar, and generates a unified summary.

## Architecture

### Core Components

#### **1. ExecutionContext** (`components/ExecutionContext.ts`)
Central state management system that tracks workflow execution.

- Stores original user prompt and execution status (`running` | `completed` | `failed`)
- Maintains registry of all tasks and their results
- Provides context summaries for agents to make informed decisions
- Prevents redundant work by tracking what data has already been collected

#### **2. CoordinationAgent** (`agents/CoordinationAgent.ts`)
The "brain" that determines what needs to be done next.

- Breaks down complex prompts into specific subtasks
- Analyzes completed tasks to avoid redundant work
- Distinguishes between data collection tasks and synthesis tasks
- Marks execution as complete when all necessary work is done
- Uses structured LLM outputs (Zod schemas) for reliable decision-making

#### **3. ToolFilterAgent** (`agents/ToolFilterAgent.ts`)
Intelligent tool selector that narrows down available tools to only relevant ones.

- Reviews 6 available tools: Gmail, Calendar, Web Search, YouTube, Notion, Wolfram Alpha
- Analyzes task requirements and previous task results
- Returns empty tool set for synthesis tasks (no new data needed)
- Provides reasoning for each tool selection

#### **4. ExecutionAgent** (`agents/ExecutionAgent.ts`)
The "worker" that executes tasks using selected tools.

- Uses AI SDK's `streamText` for multi-step agentic execution (up to 10 steps)
- LLM autonomously decides which tools to call and when
- Checks previous task data before making redundant tool calls
- Returns both natural language output AND structured tool data
- Automatically updates ExecutionContext with results

#### **5. SynthesisAgent** (`agents/SynthesisAgent.ts`)
Generates cohesive final responses by synthesizing all task outputs.

- Combines information from multiple tasks seamlessly
- Provides direct answers without listing implementation details
- Uses conversational, helpful tone with markdown formatting

#### **6. BaseAgent** (`agents/BaseAgent.ts`)
Abstract base class providing common functionality for all agents.

- Initializes Google Gemini model (`gemini-2.5-flash`)
- Provides message pipe access and error handling
- Standardized methods: `sendStatus()`, `sendInfo()`, `ask()`, etc.

### Message Pipe System

Communication layer for agents to interact with users.

- **IMessagePipe**: Interface defining communication contract
- **ConsoleMessagePipe**: CLI implementation with readline for local testing
- **WSMessagePipe**: WebSocket implementation for real-time frontend communication

Message types: `status`, `question`, `info`, `error`, `final`

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   # Create .env file in packages/playground/
   GEMINI_API_KEY=your_api_key_here
   ```
   Get your API key from: https://aistudio.google.com/app/apikey

## Usage

### Console Mode (Local Testing)
```bash
npm run start:console
```
Interactive CLI mode with readline prompts.

### WebSocket Server Mode (Production)
```bash
npm start
```
Starts WebSocket server on `ws://localhost:8081` for frontend integration.

**Client Protocol**:
```json
// Execute workflow
{ "type": "execute_workflow", "prompt": "Your task here" }

// Reconnect to session
{ "type": "reconnect", "oldClientId": "client_123..." }
```

### Development Mode
```bash
npm run dev
```
Auto-reload on file changes.

## Example Workflows

**Simple Request**:
```
"Summarize what I have to do today"
```
→ Fetches Gmail + Calendar → Synthesizes unified summary

**Complex Multi-Step**:
```
"Find the latest AI research videos and create a Notion page with summaries"
```
→ Searches YouTube → Extracts video info → Creates Notion page → Confirms completion

**Data Analysis**:
```
"What's 2^128 and should I schedule a meeting about it?"
```
→ Queries Wolfram Alpha → Checks calendar availability → Provides recommendation

## Workflow Execution Flow

```
1. User provides natural language prompt
2. ExecutionContext initialized with prompt and message pipe
3. All agents initialized (Coordination, ToolFilter, Execution, Synthesis)
4. Loop while status is "running":
   a. CoordinationAgent determines next task (or marks complete)
   b. ToolFilterAgent selects relevant tools
   c. ExecutionAgent executes task autonomously
   d. Results automatically update ExecutionContext
5. SynthesisAgent generates cohesive final response
6. Response sent to user via message pipe
```

## Technologies

- **AI SDK** (v5.0.76): Core framework for LLM interactions
- **Google Gemini** (`gemini-2.5-flash`): LLM for all agents
- **Zod** (v4.1.12): Schema validation for structured outputs
- **WebSocket** (`ws`): Real-time bidirectional communication
- **TypeScript** with ES modules

## Scalability Features

- **Task Limit**: CoordinationAgent intelligently determines completion (no hard limit)
- **Step Limit**: ExecutionAgent limited to 10 tool calls per task
- **Timeout**: WSMessagePipe questions timeout after 5 minutes
- **Concurrent Sessions**: WebSocket server supports multiple isolated client sessions
- **Reconnection Support**: Clients can reconnect and resume sessions