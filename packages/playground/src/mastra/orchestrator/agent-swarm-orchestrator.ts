import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { CoordinationAgent } from "../agents/coordination-agent";
import { ToolFilterAgent } from "../agents/tool-filter-agent";
import { ExecutionAgent } from "../agents/execution-agent";
import { BrowserUseAgent } from "../agents/browser-use-agent";
import { TaskStateManager } from "../state/task-state-manager";
import { Task, TaskStep, AgentResult } from "../types/agent-types";

export class AgentSwarmOrchestrator {
  private coordinationAgent: CoordinationAgent;
  private toolFilterAgent: ToolFilterAgent;
  private executionAgent: ExecutionAgent;
  private browserUseAgent: BrowserUseAgent;
  private taskStateManager: TaskStateManager;

  constructor(taskStateManager: TaskStateManager) {
    this.taskStateManager = taskStateManager;
    this.coordinationAgent = new CoordinationAgent();
    this.toolFilterAgent = new ToolFilterAgent();
    this.executionAgent = new ExecutionAgent();
    this.browserUseAgent = new BrowserUseAgent();
  }

  async initialize(): Promise<void> {
    await this.taskStateManager.initialize();
  }

  // Main entry point for executing prompts
  async executePrompt(prompt: string): Promise<{
    success: boolean;
    taskId: string;
    result?: any;
    error?: string;
    status: string;
  }> {
    try {
      // Step 1: Create a new task with the coordination agent
      const task = await this.coordinationAgent.createTask(prompt);
      await this.taskStateManager.saveTask(task);
      
      console.log(`Created task ${task.id} with ${task.steps.length} steps`);
      
      // Step 2: Execute the task workflow
      const finalResult = await this.executeTaskWorkflow(task.id);
      
      return {
        success: finalResult.success,
        taskId: task.id,
        result: finalResult.result,
        error: finalResult.error,
        status: finalResult.status
      };
      
    } catch (error) {
      console.error("Error executing prompt:", error);
      return {
        success: false,
        taskId: "",
        error: error instanceof Error ? error.message : "Unknown error",
        status: "failed"
      };
    }
  }

  // Execute the complete workflow for a task
  private async executeTaskWorkflow(taskId: string): Promise<AgentResult> {
    let currentResult: AgentResult;
    
    while (true) {
      // Run the next step via coordination agent
      currentResult = await this.coordinationAgent.runTask(taskId);
      
      // Log the execution
      await this.taskStateManager.logExecution(
        taskId,
        currentResult.agentName,
        "step-execution",
        currentResult.stepId,
        currentResult.result,
        currentResult.error
      );
      
      // Handle different result states
      if (currentResult.status === "completed" && currentResult.success) {
        // Task completed successfully
        console.log(`Task ${taskId} completed successfully`);
        break;
      } else if (currentResult.status === "failed") {
        // Task failed
        console.error(`Task ${taskId} failed:`, currentResult.error);
        break;
      } else if (currentResult.status === "requires-human") {
        // Task requires human intervention
        console.log(`Task ${taskId} requires human intervention:`, currentResult.humanMessage);
        break;
      } else if (currentResult.status === "suspended") {
        // Task is suspended, delegate to appropriate agent
        const delegatedResult = await this.delegateToAgent(taskId, currentResult);
        
        if (delegatedResult.status === "completed") {
          // Continue with next step
          continue;
        } else {
          // Delegation failed or requires further action
          currentResult = delegatedResult;
          break;
        }
      }
    }
    
    return currentResult;
  }

  // Delegate suspended tasks to appropriate specialized agents
  private async delegateToAgent(taskId: string, suspendedResult: AgentResult): Promise<AgentResult> {
    const task = await this.taskStateManager.getTask(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    const currentStep = task.steps.find(s => s.id === suspendedResult.stepId);
    if (!currentStep) {
      throw new Error(`Step ${suspendedResult.stepId} not found in task ${taskId}`);
    }

    console.log(`Delegating step ${currentStep.name} to specialized agents`);

    // Step 1: Use Tool Filter Agent to identify required tools
    if (this.toolFilterAgent.canHandle(currentStep)) {
      const toolFilterResult = await this.toolFilterAgent.executeTask(task, currentStep);
      
      if (toolFilterResult.success && toolFilterResult.result?.tools) {
        // Update step metadata with recommended tools
        currentStep.metadata = {
          ...currentStep.metadata,
          recommendedTool: toolFilterResult.result.primaryTool,
          fallbackTools: toolFilterResult.result.fallbackTools,
          availableTools: toolFilterResult.result.tools
        };
        
        await this.taskStateManager.saveTaskStep(currentStep, taskId);
      }
    }

    // Step 2: Execute with Execution Agent
    if (this.executionAgent.canHandle(currentStep)) {
      const executionResult = await this.executionAgent.executeTask(task, currentStep);
      
      await this.taskStateManager.logExecution(
        taskId,
        this.executionAgent.name,
        "execute-task",
        currentStep.id,
        executionResult.result,
        executionResult.error
      );
      
      // Update step status
      await this.taskStateManager.updateStepStatus(
        currentStep.id,
        executionResult.status,
        this.executionAgent.name
      );
      
      if (executionResult.success || executionResult.status !== "suspended") {
        return executionResult;
      }
    }

    // Step 3: Fallback to Browser Use Agent if execution agent suggests it
    if (this.browserUseAgent.canHandle(currentStep)) {
      console.log(`Falling back to browser automation for step ${currentStep.name}`);
      
      const browserResult = await this.browserUseAgent.executeTask(task, currentStep);
      
      await this.taskStateManager.logExecution(
        taskId,
        this.browserUseAgent.name,
        "browser-automation",
        currentStep.id,
        browserResult.result,
        browserResult.error
      );
      
      // Update step status
      await this.taskStateManager.updateStepStatus(
        currentStep.id,
        browserResult.status,
        this.browserUseAgent.name
      );
      
      return browserResult;
    }

    // If no agent can handle it, mark as requiring human intervention
    return {
      success: false,
      taskId,
      stepId: currentStep.id,
      agentName: "orchestrator",
      status: "requires-human",
      humanMessage: `No agent could handle step: ${currentStep.name}. Manual intervention required.`,
      nextActions: ["await-human-intervention"]
    };
  }

  // Create Mastra agent tools for external usage
  createMastraTools(): Record<string, any> {
    return {
      executePrompt: createTool({
        id: "execute-prompt",
        description: "Execute a complex task using the agent swarm",
        inputSchema: z.object({
          prompt: z.string().describe("The task prompt to execute")
        }),
        outputSchema: z.object({
          success: z.boolean(),
          taskId: z.string(),
          result: z.any().optional(),
          error: z.string().optional(),
          status: z.string()
        }),
        execute: async ({ context }) => {
          return await this.executePrompt(context.prompt);
        }
      }),

      getTaskStatus: createTool({
        id: "get-task-status",
        description: "Get the current status of a task",
        inputSchema: z.object({
          taskId: z.string().describe("The task ID to check")
        }),
        outputSchema: z.object({
          task: z.any().optional(),
          workflowState: z.any().optional(),
          executionLog: z.array(z.any()).optional()
        }),
        execute: async ({ context }) => {
          const task = await this.taskStateManager.getTask(context.taskId);
          const workflowState = await this.taskStateManager.getWorkflowState(context.taskId);
          const executionLog = await this.taskStateManager.getTaskExecutionLog(context.taskId, 20);
          
          return { task, workflowState, executionLog };
        }
      }),

      listTasks: createTool({
        id: "list-tasks",
        description: "List recent tasks or tasks by status",
        inputSchema: z.object({
          status: z.enum(["pending", "in-progress", "suspended", "completed", "failed", "requires-human"]).optional(),
          limit: z.number().default(10)
        }),
        outputSchema: z.object({
          tasks: z.array(z.any()),
          statistics: z.any().optional()
        }),
        execute: async ({ context }) => {
          let tasks;
          if (context.status) {
            tasks = await this.taskStateManager.getTasksByStatus(context.status);
          } else {
            tasks = await this.taskStateManager.getRecentTasks(context.limit);
          }
          
          const statistics = await this.taskStateManager.getTaskStatistics();
          
          return { tasks, statistics };
        }
      })
    };
  }

  // Get system status
  async getSystemStatus(): Promise<{
    totalTasks: number;
    tasksByStatus: Record<string, number>;
    averageCompletionTime?: number;
    activeAgents: string[];
    recentActivity: any[];
  }> {
    const statistics = await this.taskStateManager.getTaskStatistics();
    const recentTasks = await this.taskStateManager.getRecentTasks(5);
    
    return {
      totalTasks: statistics.total,
      tasksByStatus: statistics.byStatus,
      averageCompletionTime: statistics.averageCompletionTime,
      activeAgents: [
        this.coordinationAgent.name,
        this.toolFilterAgent.name,
        this.executionAgent.name,
        this.browserUseAgent.name
      ],
      recentActivity: recentTasks.map(task => ({
        taskId: task.id,
        prompt: task.originalPrompt.substring(0, 100) + "...",
        status: task.status,
        updatedAt: task.updatedAt
      }))
    };
  }
}