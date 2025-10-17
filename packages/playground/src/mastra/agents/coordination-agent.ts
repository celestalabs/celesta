import { Agent } from "@mastra/core";
import { z } from "zod";
import { 
  BaseAgent, 
  Task, 
  TaskStep, 
  AgentResult, 
  TaskStatus, 
  WorkflowState,
  TaskSchema,
  TaskStepSchema,
  AgentResultSchema
} from "../types/agent-types";

export class CoordinationAgent implements BaseAgent {
  name = "coordination-agent";
  description = "Project manager agent that orchestrates task execution and manages workflow state";

  private tasks: Map<string, Task> = new Map();
  private workflowStates: Map<string, WorkflowState> = new Map();

  async executeTask(task: Task, step: TaskStep): Promise<AgentResult> {
    // Coordination agent mainly manages other agents
    // This method handles coordination-specific steps
    
    try {
      switch (step.name) {
        case "initialize-workflow":
          return await this.initializeWorkflow(task, step);
        case "update-status":
          return await this.updateTaskStatus(task, step);
        case "coordinate-agents":
          return await this.coordinateAgents(task, step);
        default:
          throw new Error(`Unknown coordination step: ${step.name}`);
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
    const coordinationSteps = [
      "initialize-workflow",
      "update-status", 
      "coordinate-agents",
      "plan-steps"
    ];
    return coordinationSteps.includes(step.name);
  }

  // Core coordination methods
  async createTask(originalPrompt: string): Promise<Task> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Break down prompt into initial steps (simplified for now)
    const steps = await this.planSteps(originalPrompt);
    
    const task: Task = {
      id: taskId,
      originalPrompt,
      steps,
      status: "pending",
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.tasks.set(taskId, task);
    
    // Initialize workflow state
    const workflowState: WorkflowState = {
      taskId,
      currentStep: 0,
      totalSteps: steps.length,
      stepStatuses: {},
      lastUpdated: new Date()
    };
    
    steps.forEach(step => {
      workflowState.stepStatuses[step.id] = step.status;
    });
    
    this.workflowStates.set(taskId, workflowState);
    
    return task;
  }

  async runTask(taskId: string, stepId?: string): Promise<AgentResult> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    const workflowState = this.workflowStates.get(taskId);
    if (!workflowState) {
      throw new Error(`Workflow state for task ${taskId} not found`);
    }

    // Determine which step to run
    const targetStep = stepId 
      ? task.steps.find(s => s.id === stepId)
      : this.getNextPendingStep(task);

    if (!targetStep) {
      return {
        success: true,
        taskId,
        stepId: stepId || "",
        agentName: this.name,
        status: "completed",
        result: "All steps completed",
        nextActions: []
      };
    }

    // Update step status to in-progress
    await this.updateStepStatus(taskId, targetStep.id, "in-progress");

    // Delegate to appropriate agent based on step requirements
    const result = await this.delegateStep(task, targetStep);
    
    // Update workflow state based on result
    await this.updateStepStatus(taskId, targetStep.id, result.status);
    
    return result;
  }

  async updateTaskStatus(task: Task, step: TaskStep): Promise<AgentResult> {
    const metadata = step.metadata as { status?: TaskStatus; stepId?: string };
    
    if (metadata.status && metadata.stepId) {
      await this.updateStepStatus(task.id, metadata.stepId, metadata.status);
    }

    return {
      success: true,
      taskId: task.id,
      stepId: step.id,
      agentName: this.name,
      status: "completed",
      result: "Status updated successfully",
      nextActions: []
    };
  }

  private async initializeWorkflow(task: Task, step: TaskStep): Promise<AgentResult> {
    // Already handled in createTask, but can be used for re-initialization
    const workflowState = this.workflowStates.get(task.id);
    
    return {
      success: true,
      taskId: task.id,
      stepId: step.id,
      agentName: this.name,
      status: "completed",
      result: workflowState,
      nextActions: ["run-next-step"]
    };
  }

  private async coordinateAgents(task: Task, step: TaskStep): Promise<AgentResult> {
    // This would coordinate between Tool Filter, Execution, and Browser agents
    // For now, simplified implementation
    
    return {
      success: true,
      taskId: task.id,
      stepId: step.id,
      agentName: this.name,
      status: "completed",
      result: "Agents coordinated",
      nextActions: ["continue-execution"]
    };
  }

  private async planSteps(prompt: string): Promise<TaskStep[]> {
    // Simplified step planning - in real implementation, this would use LLM
    const commonSteps = [
      {
        id: "step_1",
        name: "analyze-requirements",
        description: `Analyze the requirements from: ${prompt}`,
        status: "pending" as TaskStatus,
        dependencies: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: "step_2", 
        name: "identify-tools",
        description: "Identify required tools and integrations",
        status: "pending" as TaskStatus,
        dependencies: ["step_1"],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: "step_3",
        name: "execute-task",
        description: "Execute the main task",
        status: "pending" as TaskStatus,
        dependencies: ["step_2"],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    return commonSteps;
  }

  private getNextPendingStep(task: Task): TaskStep | undefined {
    return task.steps.find(step => {
      if (step.status !== "pending") return false;
      
      // Check if all dependencies are completed
      const dependenciesCompleted = step.dependencies.every(depId => {
        const depStep = task.steps.find(s => s.id === depId);
        return depStep?.status === "completed";
      });
      
      return dependenciesCompleted;
    });
  }

  private async updateStepStatus(taskId: string, stepId: string, status: TaskStatus): Promise<void> {
    const task = this.tasks.get(taskId);
    const workflowState = this.workflowStates.get(taskId);
    
    if (!task || !workflowState) {
      throw new Error(`Task or workflow state not found for ${taskId}`);
    }

    // Update task step
    const step = task.steps.find(s => s.id === stepId);
    if (step) {
      step.status = status;
      step.updatedAt = new Date();
    }

    // Update workflow state
    workflowState.stepStatuses[stepId] = status;
    workflowState.lastUpdated = new Date();
    
    // Update overall task status
    const allCompleted = task.steps.every(s => s.status === "completed");
    const anyFailed = task.steps.some(s => s.status === "failed");
    const anyRequiresHuman = task.steps.some(s => s.status === "requires-human");
    
    if (anyFailed) {
      task.status = "failed";
    } else if (anyRequiresHuman) {
      task.status = "requires-human";
    } else if (allCompleted) {
      task.status = "completed";
    } else {
      task.status = "in-progress";
    }
    
    task.updatedAt = new Date();
  }

  private async delegateStep(task: Task, step: TaskStep): Promise<AgentResult> {
    // This is where the coordination agent would delegate to other agents
    // For now, return a stubbed result that indicates delegation is needed
    
    return {
      success: true,
      taskId: task.id,
      stepId: step.id,
      agentName: this.name,
      status: "suspended",
      suspendReason: "Waiting for delegation to specialized agent",
      nextActions: ["delegate-to-tool-filter", "delegate-to-execution"]
    };
  }

  // Getters for external access
  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  getWorkflowState(taskId: string): WorkflowState | undefined {
    return this.workflowStates.get(taskId);
  }

  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }
}