import {
  type WorkflowTask,
  type WorkflowTaskResult,
  BaseAgent,
  logger,
} from "@celesta/common";
import type { MessageContext } from "@celesta/session";
import { stepCountIs, streamText, type ToolSet } from "ai";

const log = logger("ExecutionAgent");

type ExecutionAgentConfig = {
  // Configuration options for ExecutionAgent can be added here
  messageContext: MessageContext;
  tools: ToolSet;
  task: WorkflowTask;
  taskResults: WorkflowTaskResult[];
};

const createInstructions = (
  dateString: string,
  taskDescription: string,
  taskGoal: string,
  contextSection: string
) => `## 1. Identity and Role

You are the **Execution Agent**, the 'doer' in a multi-agent workflow. You receive a single, specific \`Task\` from the Coordination Agent.

* **Your Role:** Your sole purpose is to **execute the \`Assigned Task\`** using your available tools and context. You are *not* a planner; you are an *executor*.
* **Your Communication:** You *do not* talk to the user in a conversational way. Your *only* two ways to communicate are:
    1.  By returning your **final summary** when your task is complete.
    2.  By using the \`system__askUserQuestion\` tool if you are blocked.

---

## 2. Your Assignment

* **Current Date:** ${dateString}
* **Assigned Task:** ${taskDescription}
* **Task Goal:** ${taskGoal}
* **Tools for this Task:** [The prompt would inject the list of tools selected by the Coordinator here]
* **Workflow History (Summary):** ${contextSection}

---

## 3. Operational Mandate & Rules

You must follow these rules to complete your task.

**A. Trust Your Assignment**
Your job is to **execute the Assigned Task**, not to question or re-plan it. All your reasoning should be focused *only* on the *best way to complete* the specific instruction you were given.

**B. How to Get Context**
The Workflow History only shows you task names and statuses. To get the *actual data* or *output* from a previous step, you **must** use the \`system__getPreviousTaskResults('task-slug')\` tool. This is the *only* way to access past results.

**C. How to Handle Ambiguity (Your *Only* Safety Valve)**
You cannot talk to the user. If a task is ambiguous, or you lack critical information for a WRITE operation (like an email address or a specific file name), you **must not** guess.

* **DO NOT** write "I am not sure what to do."
* **DO** use the \`system__askUserQuestion('Your clear, specific question for the user')\` tool. This will pause the workflow and get the information you need.

**D. Execute and Iterate**
It is normal to call multiple tools. Your internal process should be:
1.  Do I need data from a past task? If yes, use \`system__getPreviousTaskResults\`.
2.  What new information do I need? Call the appropriate tools (like \`web_search\`, \`read_file\`, etc.).
3.  Continue this process until you have all the information needed to satisfy the Assigned Task.

If you need information from a user, do not hesitate to ask using the designated tool. Your text response is final for this task. The user cannot respond directly to it; as such, you must use this tool during your task execution.

---

## 4. Output Requirements

Your final output **must be a concise, human-readable summary** of what you accomplished.

* **This summary is shown directly to the user.**
* **DO NOT** return large raw data dumps (like a 500-line JSON object). The system saves that automatically.
* **DO** focus on the key insights, answers, or outcomes. Your summary is the *result* of the task.

**Good Output Example (if task was "Check TheCompany's stock"):**
> "I successfully retrieved the current stock price for TheCompany (TCO): it is $150.45, up 2.1% on the day."

**Bad Output Example:**
> "I have finished the task. The tool call returned { 'symbol': 'TCO', 'price': 150.45, 'change': 3.12, 'changePercent': 0.021, ... }"`;

export class ExecutionAgent extends BaseAgent {
  private tools: ToolSet;
  private task: WorkflowTask;
  private taskResults: WorkflowTaskResult[];

  constructor({
    messageContext,
    tools,
    task,
    taskResults,
  }: ExecutionAgentConfig) {
    super(messageContext);
    this.task = task;
    this.tools = tools;
    this.taskResults = taskResults;
  }

  async onInitialize(): Promise<WorkflowTaskResult> {
    log(`Starting execution for task: ${this.task.slug}`, [
      this.messageContext.clientId,
      this.messageContext.contextId,
    ]);

    try {
      let contextSection = "";
      if (this.taskResults.length > 0) {
        contextSection = `\n\nPREVIOUS TASKS RESULTS:\n`;
        this.taskResults.forEach((taskData, index) => {
          if (!taskData.success) return; // Skip failed tasks
          contextSection += `${index + 1}. ${taskData.taskSlug}. This task's raw results are accessible via the tool system__getPreviousTaskResults and passing the slug ${taskData.taskSlug}.\n`;
        });
        contextSection += `\nIMPORTANT: If the information needed for your current task was already collected in previous tasks, USE THAT INFORMATION instead of calling tools again. Only use tools if you need NEW information that hasn't been collected yet.\n`;
      }

      // Use streamText for multi-step agentic behavior
      const now = new Date();
      const dateString = now.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const prompt = createInstructions(
        dateString,
        this.task.description,
        this.task.goal,
        contextSection
      );

      log(prompt);

      const toolCallResults: [string, string][] = [];

      const { textStream } = streamText({
        model: this.model,
        tools: this.tools,
        stopWhen: stepCountIs(20), // Limit to 20 steps
        prompt,
        onStepFinish(step) {
          const stepToolResults = step.toolResults
            .filter(
              ({ toolName }) => toolName !== "system__get_previous_task_results"
            )
            .map(
              ({ toolName, input, output }) =>
                [
                  `${toolName}(${JSON.stringify({ input })})`,
                  JSON.stringify({ output }),
                ] as [string, string]
            );

          log("Step completed... Tools", stepToolResults);

          toolCallResults.push(...stepToolResults);
        },
      });

      const text = await this.streamChat(textStream);

      const outputText = text || "Task completed.";

      const taskResult: WorkflowTaskResult = {
        taskSlug: this.task.slug,
        success: true,
        finalResult: outputText,
        toolCallResults,
      };

      log(
        `Task ${this.task.slug} completed successfully. Output:\n---\n`,
        outputText,
        "\n---\nTool Results:\n",
        taskResult.toolCallResults
      );

      return taskResult;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";

      // Handle other errors normally
      this.sendError(`Task ${this.task.slug} failed: ${errorMsg}`);

      const result: WorkflowTaskResult = {
        taskSlug: this.task.slug,
        success: false,
        error: errorMsg,
      };

      return result;
    }
  }

  async onUserMessage(): Promise<void> {}
}
