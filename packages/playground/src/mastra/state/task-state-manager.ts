import { Task, TaskStep, TaskStatus, WorkflowState } from "../types/agent-types";

export class TaskStateManager {
  private tasks: Map<string, Task> = new Map();
  private workflowStates: Map<string, WorkflowState> = new Map();
  private executionLogs: Array<{
    id: string;
    taskId: string;
    stepId?: string;
    agentName: string;
    action: string;
    result?: any;
    error?: string;
    timestamp: Date;
  }> = [];

  async initialize(): Promise<void> {
    // For now, using in-memory storage
    // In production, this would integrate with Mastra's LibSQLStore for persistence
  }

  async saveTask(task: Task): Promise<void> {
    this.tasks.set(task.id, { ...task });
    
    // Also save the workflow state if it doesn't exist
    if (!this.workflowStates.has(task.id)) {
      const stepStatuses: Record<string, TaskStatus> = {};
      task.steps.forEach(step => {
        stepStatuses[step.id] = step.status;
      });
      
      const workflowState: WorkflowState = {
        taskId: task.id,
        currentStep: 0,
        totalSteps: task.steps.length,
        stepStatuses,
        lastUpdated: new Date()
      };
      
      this.workflowStates.set(task.id, workflowState);
    }
  }

  async saveTaskStep(step: TaskStep, taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Update or add the step
    const stepIndex = task.steps.findIndex(s => s.id === step.id);
    if (stepIndex >= 0) {
      task.steps[stepIndex] = { ...step };
    } else {
      task.steps.push({ ...step });
    }

    // Update the task
    task.updatedAt = new Date();
    this.tasks.set(taskId, task);
  }

  async getTask(taskId: string): Promise<Task | null> {
    const task = this.tasks.get(taskId);
    return task ? { ...task } : null;
  }

  async updateTaskStatus(taskId: string, status: TaskStatus, currentStepId?: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.status = status;
    if (currentStepId) {
      task.currentStepId = currentStepId;
    }
    task.updatedAt = new Date();
    
    this.tasks.set(taskId, task);
  }

  async updateStepStatus(stepId: string, status: TaskStatus, assignedAgent?: string): Promise<void> {
    // Find the task containing this step
    for (const [taskId, task] of this.tasks.entries()) {
      const step = task.steps.find(s => s.id === stepId);
      if (step) {
        step.status = status;
        if (assignedAgent) {
          step.assignedAgent = assignedAgent;
        }
        step.updatedAt = new Date();
        
        // Update workflow state
        const workflowState = this.workflowStates.get(taskId);
        if (workflowState) {
          workflowState.stepStatuses[stepId] = status;
          workflowState.lastUpdated = new Date();
        }
        
        return;
      }
    }
    
    throw new Error(`Step ${stepId} not found`);
  }

  async saveWorkflowState(workflowState: WorkflowState): Promise<void> {
    this.workflowStates.set(workflowState.taskId, { ...workflowState });
  }

  async getWorkflowState(taskId: string): Promise<WorkflowState | null> {
    const state = this.workflowStates.get(taskId);
    return state ? { ...state } : null;
  }

  async logExecution(
    taskId: string, 
    agentName: string, 
    action: string, 
    stepId?: string,
    result?: any,
    error?: string
  ): Promise<void> {
    const logEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      taskId,
      stepId,
      agentName,
      action,
      result,
      error,
      timestamp: new Date()
    };
    
    this.executionLogs.push(logEntry);
    
    // Keep only last 1000 log entries to prevent memory issues
    if (this.executionLogs.length > 1000) {
      this.executionLogs = this.executionLogs.slice(-1000);
    }
  }

  async getTasksByStatus(status: TaskStatus): Promise<Task[]> {
    const tasks: Task[] = [];
    for (const task of this.tasks.values()) {
      if (task.status === status) {
        tasks.push({ ...task });
      }
    }
    return tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getTaskExecutionLog(taskId: string, limit: number = 100): Promise<any[]> {
    return this.executionLogs
      .filter(log => log.taskId === taskId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async getRecentTasks(limit: number = 10): Promise<Task[]> {
    const allTasks = Array.from(this.tasks.values());
    return allTasks
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, limit);
  }

  async deleteTask(taskId: string): Promise<void> {
    this.tasks.delete(taskId);
    this.workflowStates.delete(taskId);
    
    // Remove execution logs for this task
    this.executionLogs = this.executionLogs.filter(log => log.taskId !== taskId);
  }

  async getTaskStatistics(): Promise<{
    total: number;
    byStatus: Record<TaskStatus, number>;
    averageCompletionTime?: number;
  }> {
    const allTasks = Array.from(this.tasks.values());
    const total = allTasks.length;
    
    const byStatus: Record<string, number> = {};
    let completedTasks: Task[] = [];
    
    for (const task of allTasks) {
      byStatus[task.status] = (byStatus[task.status] || 0) + 1;
      if (task.status === "completed") {
        completedTasks.push(task);
      }
    }
    
    let averageCompletionTime: number | undefined;
    if (completedTasks.length > 0) {
      const totalTime = completedTasks.reduce((sum, task) => {
        return sum + (task.updatedAt.getTime() - task.createdAt.getTime());
      }, 0);
      averageCompletionTime = totalTime / completedTasks.length;
    }

    return {
      total,
      byStatus: byStatus as Record<TaskStatus, number>,
      averageCompletionTime
    };
  }

  // Utility methods for development and debugging
  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  getAllWorkflowStates(): WorkflowState[] {
    return Array.from(this.workflowStates.values());
  }

  getAllExecutionLogs(): any[] {
    return [...this.executionLogs];
  }

  clearAllData(): void {
    this.tasks.clear();
    this.workflowStates.clear();
    this.executionLogs.length = 0;
  }
}