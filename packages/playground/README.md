# Celesta Workflow Automation Framework

A next-generation workflow automation framework powered by AI agents that converts natural language prompts into actionable sequential workflows.

## Architecture

The framework consists of five main components:

### 1. **ExecutionContext**
Manages the state and context of task execution:
- Stores the original prompt
- Tracks tasks and their execution status
- Maintains results from executed tasks
- Generates cohesive responses from multiple data sources

### 2. **CoordinationAgent**
Determines the next task to execute:
- Breaks down complex prompts into manageable subtasks
- Uses LLM to intelligently plan task sequences
- Marks execution as completed or failed when appropriate

### 3. **ToolFilterAgent**
Selects appropriate tools for each task:
- Analyzes task requirements using LLM
- Filters from expansive tool library (Gmail, Calendar, YouTube, Web Search, Notion, Wolfram Alpha)
- Returns structured tool selections with reasoning

### 4. **ExecutionAgent**
Executes tasks using selected tools:
- Calls tools through AI SDK
- Automatically updates execution context with results
- Returns success/failure status and natural language descriptions

### 5. **MessagePipe**
Facilitates communication:
- Sends status updates to console
- Allows agents to ask clarifying questions
- Logs all messages with timestamps and sender information

## Available Tools

- **Gmail**: Search, read, and send emails
- **Google Calendar**: Manage events and check availability
- **Web Search**: Search the internet for information
- **YouTube**: Search and get video information
- **Notion**: Manage pages and databases
- **Wolfram Alpha**: Computational knowledge queries

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file:
```bash
cp .env.example .env
```

3. Add your Gemini API key to `.env`:
```
GEMINI_API_KEY=your_api_key_here
```

Get your API key from: https://aistudio.google.com/app/apikey

## Usage

Run the framework:
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

You'll be prompted to enter a complex task. Examples:
- "Summarize what I have to do today"
- "Find the latest AI research videos and create a Notion page with summaries"
- "What's the weather forecast and should I reschedule my outdoor meeting?"

## Project Structure

```
packages/playground/
├── components/
│   ├── ExecutionContext.ts      # State management
│   ├── CoordinationAgent.ts     # Task planning
│   ├── ToolFilterAgent.ts       # Tool selection
│   ├── ExecutionAgent.ts        # Task execution
│   ├── MessagePipe.ts           # Communication
│   ├── tools.ts                 # Mock tool implementations
│   ├── types.ts                 # Shared types
│   └── index.ts                 # Component exports
├── index.ts                     # Main orchestration logic
├── docs.md                      # AI SDK documentation
└── package.json
```

## How It Works

1. User provides a natural language prompt
2. **CoordinationAgent** breaks it into tasks using Gemini LLM
3. For each task:
   - **ToolFilterAgent** selects relevant tools
   - **ExecutionAgent** executes using AI SDK with tool calls
   - Results are stored in **ExecutionContext**
4. Process repeats until all tasks complete
5. Final cohesive response is generated

## Development

The framework uses:
- **AI SDK v5** by Vercel for LLM interactions
- **Gemini 2.0 Flash** for agent reasoning
- **Zod** for schema validation
- **TypeScript** for type safety
