import { 
  BaseAgent, 
  Task, 
  TaskStep, 
  AgentResult, 
  ToolInfo 
} from "../types/agent-types";

export class ToolFilterAgent implements BaseAgent {
  name = "tool-filter-agent";
  description = "Analyzes tasks and returns relevant tools and integrations";

  private toolRegistry: Map<string, ToolInfo> = new Map();

  constructor() {
    this.initializeToolRegistry();
  }

  async executeTask(task: Task, step: TaskStep): Promise<AgentResult> {
    try {
      switch (step.name) {
        case "identify-tools":
          return await this.identifyTools(task, step);
        case "rank-tools":
          return await this.rankTools(task, step);
        case "validate-tools":
          return await this.validateTools(task, step);
        default:
          throw new Error(`Unknown tool filter step: ${step.name}`);
      }
    } catch (error) {
      return {
        success: false,
        taskId: task.id,
        stepId: step.id,
        agentName: this.name,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        nextActions: ["retry", "request-human"]
      };
    }
  }

  canHandle(step: TaskStep): boolean {
    const toolFilterSteps = [
      "identify-tools",
      "rank-tools", 
      "validate-tools",
      "analyze-requirements"
    ];
    return toolFilterSteps.includes(step.name);
  }

  private async identifyTools(task: Task, step: TaskStep): Promise<AgentResult> {
    const prompt = task.originalPrompt.toLowerCase();
    const relevantTools: ToolInfo[] = [];

    // Analyze prompt for keywords and match to tools
    for (const [toolName, toolInfo] of this.toolRegistry) {
      if (this.isToolRelevant(prompt, toolInfo)) {
        relevantTools.push(toolInfo);
      }
    }

    // Sort by priority (higher priority first)
    relevantTools.sort((a, b) => b.priority - a.priority);

    // If no specific tools found, default to browser automation
    if (relevantTools.length === 0) {
      const browserTool = this.toolRegistry.get("browser-automation");
      if (browserTool) {
        relevantTools.push(browserTool);
      }
    }

    return {
      success: true,
      taskId: task.id,
      stepId: step.id,
      agentName: this.name,
      status: "completed",
      result: {
        tools: relevantTools,
        primaryTool: relevantTools[0]?.name || "browser-automation",
        fallbackTools: relevantTools.slice(1).map(t => t.name)
      },
      nextActions: ["execute-with-tools"]
    };
  }

  private async rankTools(task: Task, step: TaskStep): Promise<AgentResult> {
    const metadata = step.metadata as { tools?: ToolInfo[] };
    const tools = metadata.tools || [];

    // Rank tools based on priority, capability match, and reliability
    const rankedTools = tools
      .map(tool => ({
        ...tool,
        score: this.calculateToolScore(task.originalPrompt, tool)
      }))
      .sort((a, b) => b.score - a.score);

    return {
      success: true,
      taskId: task.id,
      stepId: step.id,
      agentName: this.name,
      status: "completed",
      result: { rankedTools },
      nextActions: ["validate-tools"]
    };
  }

  private async validateTools(task: Task, step: TaskStep): Promise<AgentResult> {
    const metadata = step.metadata as { tools?: ToolInfo[] };
    const tools = metadata.tools || [];

    // Validate tool availability and configuration
    const validatedTools = [];
    const unavailableTools = [];

    for (const tool of tools) {
      if (await this.isToolAvailable(tool)) {
        validatedTools.push(tool);
      } else {
        unavailableTools.push(tool);
      }
    }

    return {
      success: true,
      taskId: task.id,
      stepId: step.id,
      agentName: this.name,
      status: "completed",
      result: {
        validatedTools,
        unavailableTools,
        recommendedTool: validatedTools[0]?.name || "browser-automation"
      },
      nextActions: ["proceed-with-execution"]
    };
  }

  private initializeToolRegistry(): void {
    // Gmail integration
    this.toolRegistry.set("gmail-integration", {
      name: "gmail-integration",
      description: "Read, compose, and send emails through Gmail API",
      category: "integration",
      priority: 9,
      capabilities: ["read-email", "send-email", "search-email", "manage-labels"],
      requiredParams: ["gmail-access-token"]
    });

    // Calendar integration
    this.toolRegistry.set("google-calendar", {
      name: "google-calendar",
      description: "Manage calendar events and scheduling",
      category: "integration", 
      priority: 8,
      capabilities: ["create-event", "read-events", "update-event", "delete-event"],
      requiredParams: ["calendar-access-token"]
    });

    // Slack integration
    this.toolRegistry.set("slack-integration", {
      name: "slack-integration",
      description: "Send messages and interact with Slack workspace",
      category: "integration",
      priority: 7,
      capabilities: ["send-message", "read-messages", "manage-channels"],
      requiredParams: ["slack-bot-token"]
    });

    // Notion integration
    this.toolRegistry.set("notion-integration", {
      name: "notion-integration", 
      description: "Create and manage Notion pages and databases",
      category: "integration",
      priority: 6,
      capabilities: ["create-page", "update-page", "query-database", "create-database"],
      requiredParams: ["notion-api-key"]
    });

    // Trello integration
    this.toolRegistry.set("trello-integration", {
      name: "trello-integration",
      description: "Manage Trello boards, lists, and cards",
      category: "integration",
      priority: 6,
      capabilities: ["create-card", "move-card", "update-card", "manage-boards"],
      requiredParams: ["trello-api-key", "trello-token"]
    });

    // GitHub integration  
    this.toolRegistry.set("github-integration", {
      name: "github-integration",
      description: "Interact with GitHub repositories and issues",
      category: "integration",
      priority: 7,
      capabilities: ["create-issue", "update-issue", "manage-pr", "repository-operations"],
      requiredParams: ["github-token"]
    });

    // Browser automation (fallback)
    this.toolRegistry.set("browser-automation", {
      name: "browser-automation",
      description: "Automated browser interactions for any web-based task",
      category: "browser",
      priority: 4,
      capabilities: ["navigate", "click", "type", "extract-data", "form-submission"],
      requiredParams: []
    });

    // Human assistance (last resort)
    this.toolRegistry.set("human-assistance", {
      name: "human-assistance", 
      description: "Request human intervention for complex or ambiguous tasks",
      category: "human",
      priority: 1,
      capabilities: ["manual-execution", "decision-making", "complex-reasoning"],
      requiredParams: []
    });
  }

  private isToolRelevant(prompt: string, tool: ToolInfo): boolean {
    const toolKeywords: Record<string, string[]> = {
      "gmail-integration": ["email", "gmail", "mail", "send", "inbox", "compose"],
      "google-calendar": ["calendar", "schedule", "event", "meeting", "appointment", "date"],
      "slack-integration": ["slack", "message", "chat", "channel", "workspace"],
      "notion-integration": ["notion", "note", "page", "database", "wiki", "document"],
      "trello-integration": ["trello", "board", "card", "task", "project", "kanban"],
      "github-integration": ["github", "git", "repository", "code", "issue", "pull request", "pr"],
      "browser-automation": ["website", "web", "browser", "navigate", "click", "form"],
      "human-assistance": ["complex", "ambiguous", "unclear", "manual", "human"]
    };

    const keywords = toolKeywords[tool.name] || [];
    return keywords.some(keyword => prompt.includes(keyword));
  }

  private calculateToolScore(prompt: string, tool: ToolInfo): number {
    let score = tool.priority;
    
    // Boost score if tool capabilities match prompt keywords
    const capabilityMatches = tool.capabilities.filter(capability => 
      prompt.includes(capability.replace("-", " "))
    ).length;
    
    score += capabilityMatches * 2;
    
    // Prefer integrations over browser automation
    if (tool.category === "integration") {
      score += 3;
    } else if (tool.category === "browser") {
      score += 1;
    }
    
    return score;
  }

  private async isToolAvailable(tool: ToolInfo): Promise<boolean> {
    // In a real implementation, this would check:
    // - API keys/tokens are configured
    // - Service is accessible
    // - Rate limits are not exceeded
    
    // For stubbing purposes, assume integrations are available 70% of the time
    if (tool.category === "integration") {
      return Math.random() > 0.3;
    }
    
    // Browser and human tools are always "available"
    return true;
  }

  // Public method to get tool info
  getToolInfo(toolName: string): ToolInfo | undefined {
    return this.toolRegistry.get(toolName);
  }

  getAllTools(): ToolInfo[] {
    return Array.from(this.toolRegistry.values());
  }

  getToolsByCategory(category: ToolInfo["category"]): ToolInfo[] {
    return Array.from(this.toolRegistry.values()).filter(tool => tool.category === category);
  }
}