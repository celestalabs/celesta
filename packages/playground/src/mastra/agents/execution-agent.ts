import {
  BaseAgent,
  Task,
  TaskStep,
  AgentResult,
  ToolInfo
} from "../types/agent-types";

interface ExecutionContext {
  toolName: string;
  parameters: Record<string, any>;
  retryCount: number;
  maxRetries: number;
}

interface IntegrationResult {
  success: boolean;
  data?: any;
  error?: string;
  needsHuman?: boolean;
  fallbackToBrowser?: boolean;
}

export class ExecutionAgent implements BaseAgent {
  name = "execution-agent";
  description = "Executes tasks using integrations or browser automation";

  async executeTask(task: Task, step: TaskStep): Promise<AgentResult> {
    try {
      switch (step.name) {
        case "execute-task":
          return await this.executeMainTask(task, step);
        case "execute-with-integration":
          return await this.executeWithIntegration(task, step);
        case "execute-with-browser":
          return await this.executeWithBrowser(task, step);
        case "validate-execution":
          return await this.validateExecution(task, step);
        default:
          throw new Error(`Unknown execution step: ${step.name}`);
      }
    } catch (error) {
      return this.error(task.id, step.id, error instanceof Error ? error.message : "Unknown error");
    }
  }

  canHandle(step: TaskStep): boolean {
    const executionSteps = [
      "execute-task",
      "execute-with-integration", 
      "execute-with-browser",
      "validate-execution"
    ];
    return executionSteps.includes(step.name);
  }

  private async executeMainTask(task: Task, step: TaskStep): Promise<AgentResult> {
    const metadata = step.metadata as { 
      recommendedTool?: string;
      fallbackTools?: string[];
      parameters?: Record<string, any>;
    };

    const context: ExecutionContext = {
      toolName: metadata.recommendedTool || "browser-automation",
      parameters: metadata.parameters || {},
      retryCount: 0,
      maxRetries: 3
    };

    // Try primary tool first
    let result = await this.tryExecuteWithTool(task, step, context);
    
    // If failed and we have fallback tools, try them
    if (!result.success && metadata.fallbackTools) {
      for (const fallbackTool of metadata.fallbackTools) {
        context.toolName = fallbackTool;
        context.retryCount = 0;
        
        result = await this.tryExecuteWithTool(task, step, context);
        if (result.success) break;
      }
    }

    // If all tools failed, try browser automation as last resort
    if (!result.success && context.toolName !== "browser-automation") {
      context.toolName = "browser-automation";
      context.retryCount = 0;
      result = await this.tryExecuteWithTool(task, step, context);
    }

    // If still failed, request human intervention
    if (!result.success) {
      return this.requestHuman(
        task.id, 
        step.id, 
        `All automated execution methods failed. Human assistance required for: ${task.originalPrompt}`,
        result.error
      );
    }

    return this.success(task.id, step.id, result.data);
  }

  private async executeWithIntegration(task: Task, step: TaskStep): Promise<AgentResult> {
    const metadata = step.metadata as { 
      toolName: string;
      parameters: Record<string, any>;
    };

    const result = await this.callIntegration(metadata.toolName, metadata.parameters);
    
    if (result.success) {
      return this.success(task.id, step.id, result.data);
    } else if (result.fallbackToBrowser) {
      return {
        success: false,
        taskId: task.id,
        stepId: step.id,
        agentName: this.name,
        status: "suspended",
        suspendReason: "Integration failed, need to fallback to browser automation",
        nextActions: ["execute-with-browser"]
      };
    } else if (result.needsHuman) {
      return this.requestHuman(task.id, step.id, "Integration requires human intervention", result.error);
    } else {
      return this.error(task.id, step.id, result.error || "Integration execution failed");
    }
  }

  private async executeWithBrowser(task: Task, step: TaskStep): Promise<AgentResult> {
    const metadata = step.metadata as { 
      url?: string;
      actions?: Array<{ type: string; selector?: string; value?: any }>;
    };

    // In a real implementation, this would communicate with browser automation service via WebSocket
    const result = await this.callBrowserAutomation(task.originalPrompt, metadata);
    
    if (result.success) {
      return this.success(task.id, step.id, result.data);
    } else if (result.needsHuman) {
      return this.requestHuman(task.id, step.id, "Browser automation requires human assistance", result.error);
    } else {
      return this.error(task.id, step.id, result.error || "Browser automation failed");
    }
  }

  private async validateExecution(task: Task, step: TaskStep): Promise<AgentResult> {
    const metadata = step.metadata as { 
      expectedResult?: any;
      validationCriteria?: string[];
    };

    // Simple validation logic - in real implementation would be more sophisticated
    const isValid = metadata.validationCriteria?.length ? 
      this.validateCriteria(metadata.validationCriteria) : 
      true;

    if (isValid) {
      return this.success(task.id, step.id, "Execution validated successfully");
    } else {
      return {
        success: false,
        taskId: task.id,
        stepId: step.id,
        agentName: this.name,
        status: "failed",
        error: "Execution validation failed",
        nextActions: ["retry-execution", "request-human"]
      };
    }
  }

  private async tryExecuteWithTool(task: Task, step: TaskStep, context: ExecutionContext): Promise<IntegrationResult> {
    while (context.retryCount < context.maxRetries) {
      try {
        if (context.toolName === "browser-automation") {
          return await this.callBrowserAutomation(task.originalPrompt, context.parameters);
        } else {
          return await this.callIntegration(context.toolName, context.parameters);
        }
      } catch (error) {
        context.retryCount++;
        if (context.retryCount >= context.maxRetries) {
          return {
            success: false,
            error: `Tool ${context.toolName} failed after ${context.maxRetries} attempts: ${error instanceof Error ? error.message : "Unknown error"}`
          };
        }
        
        // Wait before retry (exponential backoff)
        await this.sleep(1000 * Math.pow(2, context.retryCount));
      }
    }

    return {
      success: false,
      error: `Tool ${context.toolName} failed after all retries`
    };
  }

  // Stubbed integration calls
  private async callIntegration(toolName: string, parameters: Record<string, any>): Promise<IntegrationResult> {
    // Simulate API call delay
    await this.sleep(500 + Math.random() * 1000);

    switch (toolName) {
      case "gmail-integration":
        return await this.executeGmailIntegration(parameters);
      case "google-calendar":
        return await this.executeCalendarIntegration(parameters);
      case "slack-integration":
        return await this.executeSlackIntegration(parameters);
      case "notion-integration":
        return await this.executeNotionIntegration(parameters);
      case "trello-integration":
        return await this.executeTrelloIntegration(parameters);
      case "github-integration":
        return await this.executeGitHubIntegration(parameters);
      default:
        return {
          success: false,
          error: `Unknown integration: ${toolName}`,
          fallbackToBrowser: true
        };
    }
  }

  private async callBrowserAutomation(prompt: string, parameters: Record<string, any>): Promise<IntegrationResult> {
    // Simulate browser automation via WebSocket (stubbed)
    await this.sleep(2000 + Math.random() * 3000);

    // Simulate 80% success rate for browser automation
    if (Math.random() > 0.2) {
      return {
        success: true,
        data: {
          action: "browser-automation-completed",
          prompt,
          result: "Task completed via browser automation",
          screenshots: ["step1.png", "step2.png", "final.png"]
        }
      };
    } else {
      return {
        success: false,
        error: "Browser automation encountered unexpected page structure",
        needsHuman: true
      };
    }
  }

  // Stubbed integration implementations
  private async executeGmailIntegration(parameters: Record<string, any>): Promise<IntegrationResult> {
    // Simulate Gmail API interaction
    const actions = ["read-email", "send-email", "search-email"];
    const randomAction = actions[Math.floor(Math.random() * actions.length)];
    
    return {
      success: true,
      data: {
        action: randomAction,
        result: `Gmail ${randomAction} completed successfully`,
        emailsProcessed: Math.floor(Math.random() * 10) + 1
      }
    };
  }

  private async executeCalendarIntegration(parameters: Record<string, any>): Promise<IntegrationResult> {
    return {
      success: true,
      data: {
        action: "calendar-event-created",
        result: "Calendar event created successfully",
        eventId: `event_${Date.now()}`
      }
    };
  }

  private async executeSlackIntegration(parameters: Record<string, any>): Promise<IntegrationResult> {
    return {
      success: true,
      data: {
        action: "slack-message-sent",
        result: "Slack message sent successfully",
        messageId: `msg_${Date.now()}`
      }
    };
  }

  private async executeNotionIntegration(parameters: Record<string, any>): Promise<IntegrationResult> {
    return {
      success: true,
      data: {
        action: "notion-page-created",
        result: "Notion page created successfully",
        pageId: `page_${Date.now()}`
      }
    };
  }

  private async executeTrelloIntegration(parameters: Record<string, any>): Promise<IntegrationResult> {
    return {
      success: true,
      data: {
        action: "trello-card-created",
        result: "Trello card created successfully",
        cardId: `card_${Date.now()}`
      }
    };
  }

  private async executeGitHubIntegration(parameters: Record<string, any>): Promise<IntegrationResult> {
    return {
      success: true,
      data: {
        action: "github-issue-created",
        result: "GitHub issue created successfully",
        issueNumber: Math.floor(Math.random() * 1000) + 1
      }
    };
  }

  // Utility methods
  private success(taskId: string, stepId: string, result?: any): AgentResult {
    return {
      success: true,
      taskId,
      stepId,
      agentName: this.name,
      status: "completed",
      result,
      nextActions: []
    };
  }

  private error(taskId: string, stepId: string, error: string): AgentResult {
    return {
      success: false,
      taskId,
      stepId,
      agentName: this.name,
      status: "failed",
      error,
      nextActions: ["retry", "fallback", "request-human"]
    };
  }

  private requestHuman(taskId: string, stepId: string, message: string, error?: string): AgentResult {
    return {
      success: false,
      taskId,
      stepId,
      agentName: this.name,
      status: "requires-human",
      humanMessage: message,
      error,
      nextActions: ["await-human-intervention"]
    };
  }

  private validateCriteria(criteria: string[]): boolean {
    // Simplified validation - in real implementation would check actual results
    return Math.random() > 0.1; // 90% success rate for validation
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}