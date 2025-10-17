import {
  BaseAgent,
  Task,
  TaskStep,
  AgentResult
} from "../types/agent-types";

interface BrowserAction {
  type: "navigate" | "click" | "type" | "extract" | "scroll" | "wait" | "screenshot";
  selector?: string;
  value?: any;
  url?: string;
  timeout?: number;
}

interface BrowserSession {
  sessionId: string;
  status: "active" | "suspended" | "completed" | "failed";
  actions: BrowserAction[];
  currentUrl?: string;
  screenshots: string[];
}

interface WebSocketMessage {
  type: "browser-command" | "browser-result" | "browser-status";
  sessionId: string;
  payload: any;
}

export class BrowserUseAgent implements BaseAgent {
  name = "browser-use-agent";
  description = "Handles browser automation tasks via WebSocket communication";

  private sessions: Map<string, BrowserSession> = new Map();
  private webSocketUrl = "ws://localhost:8080/browser-automation"; // Stubbed WebSocket endpoint

  async executeTask(task: Task, step: TaskStep): Promise<AgentResult> {
    try {
      switch (step.name) {
        case "browser-navigate":
          return await this.navigateToUrl(task, step);
        case "browser-interact":
          return await this.interactWithPage(task, step);
        case "browser-extract":
          return await this.extractData(task, step);
        case "browser-complete":
          return await this.completeSession(task, step);
        default:
          // For any browser-related task, use generic browser automation
          return await this.executeBrowserTask(task, step);
      }
    } catch (error) {
      return {
        success: false,
        taskId: task.id,
        stepId: step.id,
        agentName: this.name,
        status: "failed",
        error: error instanceof Error ? error.message : "Browser automation failed",
        nextActions: ["retry", "request-human"]
      };
    }
  }

  canHandle(step: TaskStep): boolean {
    const browserSteps = [
      "browser-navigate",
      "browser-interact", 
      "browser-extract",
      "browser-complete",
      "execute-with-browser"
    ];
    
    return browserSteps.includes(step.name) || 
           step.description.toLowerCase().includes("browser") ||
           step.description.toLowerCase().includes("web");
  }

  private async executeBrowserTask(task: Task, step: TaskStep): Promise<AgentResult> {
    const sessionId = this.generateSessionId();
    
    // Parse the task to determine browser actions needed
    const actions = await this.planBrowserActions(task.originalPrompt, step);
    
    const session: BrowserSession = {
      sessionId,
      status: "active",
      actions,
      screenshots: [],
      currentUrl: undefined
    };
    
    this.sessions.set(sessionId, session);
    
    // Execute the browser actions (stubbed)
    const result = await this.executeBrowserActions(sessionId, actions);
    
    if (result.success) {
      session.status = "completed";
      return {
        success: true,
        taskId: task.id,
        stepId: step.id,
        agentName: this.name,
        status: "completed",
        result: {
          sessionId,
          data: result.data,
          screenshots: session.screenshots,
          finalUrl: session.currentUrl
        },
        nextActions: []
      };
    } else {
      session.status = "failed";
      return {
        success: false,
        taskId: task.id,
        stepId: step.id,
        agentName: this.name,
        status: "failed",
        error: result.error,
        nextActions: ["retry", "request-human"]
      };
    }
  }

  private async navigateToUrl(task: Task, step: TaskStep): Promise<AgentResult> {
    const metadata = step.metadata as { url?: string };
    const url = metadata.url || this.extractUrlFromPrompt(task.originalPrompt);
    
    if (!url) {
      return {
        success: false,
        taskId: task.id,
        stepId: step.id,
        agentName: this.name,
        status: "failed",
        error: "No URL provided for navigation",
        nextActions: ["request-human"]
      };
    }

    const sessionId = this.generateSessionId();
    const result = await this.sendBrowserCommand(sessionId, {
      type: "navigate",
      url
    });

    return {
      success: result.success,
      taskId: task.id,
      stepId: step.id,
      agentName: this.name,
      status: result.success ? "completed" : "failed",
      result: result.success ? { sessionId, url } : undefined,
      error: result.error,
      nextActions: result.success ? ["browser-interact"] : ["retry"]
    };
  }

  private async interactWithPage(task: Task, step: TaskStep): Promise<AgentResult> {
    const metadata = step.metadata as { 
      sessionId?: string;
      actions?: BrowserAction[];
    };

    const sessionId = metadata.sessionId || this.generateSessionId();
    const actions = metadata.actions || await this.planInteractionActions(task.originalPrompt);

    const results = [];
    for (const action of actions) {
      const result = await this.sendBrowserCommand(sessionId, action);
      results.push(result);
      
      if (!result.success) {
        return {
          success: false,
          taskId: task.id,
          stepId: step.id,
          agentName: this.name,
          status: "failed",
          error: `Browser interaction failed: ${result.error}`,
          nextActions: ["retry", "request-human"]
        };
      }
    }

    return {
      success: true,
      taskId: task.id,
      stepId: step.id,
      agentName: this.name,
      status: "completed",
      result: { sessionId, interactions: results },
      nextActions: ["browser-extract"]
    };
  }

  private async extractData(task: Task, step: TaskStep): Promise<AgentResult> {
    const metadata = step.metadata as { 
      sessionId?: string;
      selectors?: string[];
      dataType?: string;
    };

    const sessionId = metadata.sessionId || this.generateSessionId();
    const extractionResult = await this.sendBrowserCommand(sessionId, {
      type: "extract",
      selector: metadata.selectors?.[0] || "body",
      value: metadata.dataType || "text"
    });

    return {
      success: extractionResult.success,
      taskId: task.id,
      stepId: step.id,
      agentName: this.name,
      status: extractionResult.success ? "completed" : "failed",
      result: extractionResult.success ? {
        sessionId,
        extractedData: extractionResult.data
      } : undefined,
      error: extractionResult.error,
      nextActions: extractionResult.success ? ["browser-complete"] : ["retry"]
    };
  }

  private async completeSession(task: Task, step: TaskStep): Promise<AgentResult> {
    const metadata = step.metadata as { sessionId?: string };
    const sessionId = metadata.sessionId;

    if (sessionId && this.sessions.has(sessionId)) {
      const session = this.sessions.get(sessionId)!;
      session.status = "completed";
      
      // Clean up session after a delay (in real implementation)
      setTimeout(() => {
        this.sessions.delete(sessionId);
      }, 300000); // 5 minutes
    }

    return {
      success: true,
      taskId: task.id,
      stepId: step.id,
      agentName: this.name,
      status: "completed",
      result: { sessionCompleted: true },
      nextActions: []
    };
  }

  // Stubbed WebSocket communication methods
  private async sendBrowserCommand(sessionId: string, action: BrowserAction): Promise<{success: boolean; data?: any; error?: string}> {
    // Simulate WebSocket delay
    await this.sleep(500 + Math.random() * 1000);

    // Simulate different outcomes based on action type
    const successRate = this.getSuccessRateForAction(action.type);
    
    if (Math.random() < successRate) {
      return {
        success: true,
        data: this.generateMockResult(action)
      };
    } else {
      return {
        success: false,
        error: this.generateMockError(action)
      };
    }
  }

  private async executeBrowserActions(sessionId: string, actions: BrowserAction[]): Promise<{success: boolean; data?: any; error?: string}> {
    const results = [];
    
    for (const action of actions) {
      const result = await this.sendBrowserCommand(sessionId, action);
      results.push(result);
      
      if (!result.success) {
        return {
          success: false,
          error: `Action ${action.type} failed: ${result.error}`
        };
      }
    }
    
    return {
      success: true,
      data: {
        completedActions: actions.length,
        results
      }
    };
  }

  private async planBrowserActions(prompt: string, step: TaskStep): Promise<BrowserAction[]> {
    // Simplified action planning based on prompt keywords
    const actions: BrowserAction[] = [];
    const lowerPrompt = prompt.toLowerCase();

    // Determine what kind of actions are needed
    if (lowerPrompt.includes("gmail") || lowerPrompt.includes("email")) {
      actions.push({ type: "navigate", url: "https://gmail.com" });
      actions.push({ type: "wait", timeout: 2000 });
      
      if (lowerPrompt.includes("read") || lowerPrompt.includes("check")) {
        actions.push({ type: "click", selector: "[data-testid='inbox']" });
      }
      
      if (lowerPrompt.includes("send") || lowerPrompt.includes("compose")) {
        actions.push({ type: "click", selector: "[data-testid='compose-button']" });
      }
    } else if (lowerPrompt.includes("calendar")) {
      actions.push({ type: "navigate", url: "https://calendar.google.com" });
      actions.push({ type: "wait", timeout: 2000 });
      
      if (lowerPrompt.includes("create") || lowerPrompt.includes("schedule")) {
        actions.push({ type: "click", selector: "[data-testid='create-event']" });
      }
    } else {
      // Generic web automation
      actions.push({ type: "screenshot" });
      actions.push({ type: "wait", timeout: 1000 });
    }

    return actions;
  }

  private async planInteractionActions(prompt: string): Promise<BrowserAction[]> {
    // Simplified interaction planning
    return [
      { type: "screenshot" },
      { type: "wait", timeout: 1000 },
      { type: "click", selector: "button, a, [role='button']" }
    ];
  }

  private extractUrlFromPrompt(prompt: string): string | undefined {
    const urlRegex = /https?:\/\/[^\s]+/;
    const match = prompt.match(urlRegex);
    return match ? match[0] : undefined;
  }

  private generateSessionId(): string {
    return `browser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getSuccessRateForAction(actionType: string): number {
    const successRates: Record<string, number> = {
      "navigate": 0.95,
      "click": 0.85,
      "type": 0.90,
      "extract": 0.80,
      "scroll": 0.95,
      "wait": 0.99,
      "screenshot": 0.98
    };
    
    return successRates[actionType] || 0.75;
  }

  private generateMockResult(action: BrowserAction): any {
    switch (action.type) {
      case "navigate":
        return { url: action.url, loaded: true };
      case "click":
        return { clicked: true, selector: action.selector };
      case "type":
        return { typed: action.value, selector: action.selector };
      case "extract":
        return { 
          text: "Extracted content from page",
          selector: action.selector,
          timestamp: new Date().toISOString()
        };
      case "screenshot":
        return { 
          screenshot: `screenshot_${Date.now()}.png`,
          timestamp: new Date().toISOString()
        };
      default:
        return { action: action.type, completed: true };
    }
  }

  private generateMockError(action: BrowserAction): string {
    const errors = [
      `Element not found: ${action.selector}`,
      "Page load timeout",
      "Element not clickable",
      "Navigation blocked by popup",
      "Captcha detected"
    ];
    
    return errors[Math.floor(Math.random() * errors.length)];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public methods for session management
  getSession(sessionId: string): BrowserSession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): BrowserSession[] {
    return Array.from(this.sessions.values());
  }

  suspendSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = "suspended";
      return true;
    }
    return false;
  }

  resumeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session && session.status === "suspended") {
      session.status = "active";
      return true;
    }
    return false;
  }
}