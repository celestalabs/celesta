import { Mastra } from "@mastra/core/mastra";
import { Agent } from "@mastra/core/agent";
import { PinoLogger } from "@mastra/loggers";
import { LibSQLStore } from "@mastra/libsql";
import { AgentSwarmOrchestrator } from "./orchestrator/agent-swarm-orchestrator";
import { TaskStateManager } from "./state/task-state-manager";

// Create storage and state manager
const storage = new LibSQLStore({
  // stores observability, scores, ... into memory storage, if it needs to persist, change to file:../mastra.db
  url: ":memory:",
});

const taskStateManager = new TaskStateManager();

// Create the agent swarm orchestrator
const agentSwarm = new AgentSwarmOrchestrator(taskStateManager);

// Initialize the swarm
agentSwarm.initialize().then(() => {
  console.log("Agent swarm initialized successfully");
}).catch(error => {
  console.error("Failed to initialize agent swarm:", error);
});

// Create a main coordinating agent that uses the swarm tools
const swarmCoordinatorAgent = new Agent({
  name: "Swarm Coordinator",
  instructions: `
You are the main coordination agent for an AI agent swarm system. Your role is to:

1. Receive complex prompts from users that require multiple steps or tools
2. Break down tasks and coordinate execution through the agent swarm
3. Provide status updates and results to users
4. Handle task management and monitoring

You have access to powerful tools that can execute complex tasks by coordinating between:
- A Coordination Agent (PM) that manages workflows
- A Tool Filter Agent that identifies the best tools for tasks  
- An Execution Agent that handles integrations like Gmail, Calendar, Slack, etc.
- A Browser Use Agent that can automate web interactions

Use the executePrompt tool for complex tasks that need multiple agents.
Use getTaskStatus to check on running tasks.
Use listTasks to see recent activity or tasks by status.

Always be helpful and provide clear updates on task progress.
  `,
  model: "openai/gpt-4o-mini",
  tools: agentSwarm.createMastraTools(),
});

export const mastra = new Mastra({
  agents: { 
    swarmCoordinatorAgent 
  },
  storage,
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
  telemetry: {
    // Telemetry is deprecated and will be removed in the Nov 4th release
    enabled: false,
  },
  observability: {
    // Enables DefaultExporter and CloudExporter for AI tracing
    default: { enabled: true },
  },
});

// Export the swarm orchestrator for direct access if needed
export { agentSwarm, taskStateManager };
