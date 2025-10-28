import { ToolSet } from "ai";
import { MessageContext } from "../../components/messageContext.js";
import { BaseAgent } from "../BaseAgent.js";
import { WorkflowTask, WorkflowTaskResult } from "@celesta/types";

type ExecutionAgentConfig = {
  // Configuration options for ExecutionAgent can be added here
  messageContext: MessageContext;
  tools: ToolSet;
  task: WorkflowTask;
};

export class ExecutionAgent extends BaseAgent {
  private tools: ToolSet;
  private task: WorkflowTask;

  constructor({ messageContext, tools, task }: ExecutionAgentConfig) {
    super(messageContext);
    this.task = task;
    this.tools = tools;
  }

  async onInitialize(): Promise<WorkflowTaskResult> {
    return {
      taskSlug: this.task.slug,
      success: false,
      error: "ExecutionAgent execution not yet implemented.",
    };
  }

  async onUserMessage(): Promise<void> {}
}
