import { WorkflowTaskResult } from "@celesta/types";
import { generateText, ToolSet } from "ai";
import { MessageContext } from "../../components/messageContext.js";
import { logger } from "../../utils/logger.js";
import { BaseAgent } from "../BaseAgent.js";

const log = logger("SynthesisAgent");

type SynthesisAgentConfig = {
  prompt: string;
  messageContext: MessageContext;
  processedTaskResults: WorkflowTaskResult[];
  tools: ToolSet;
};

export class SynthesisAgent extends BaseAgent {
  private prompt: string;
  private processedTaskResults: WorkflowTaskResult[];
  private tools: ToolSet;

  constructor({
    prompt,
    messageContext,
    processedTaskResults,
    tools,
  }: SynthesisAgentConfig) {
    super(messageContext);
    this.prompt = prompt;
    this.processedTaskResults = processedTaskResults;
    this.tools = tools;
  }

  async onInitialize() {
    const now = new Date();
    const dateString = now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const taskContext = this.processedTaskResults
      .map((task, i) => {
        if (!task.success) return;
        return `- Task ${i + 1}. ${task.taskSlug}:\n\n  ${task.finalResult}\n\n  Tool Call Results${task.toolCallResults.map(([tool, result]) => `\n   - ${tool}: ${result}`).join("")}`;
      })
      .join("\n\n");

    const systemPrompt = `Act as a synthesis agent responsible for generating a comprehensive, actionable response to the user's request using the results of completed workflow tasks.
  Current Date: ${dateString}

  Your objectives:
  - Reason step-by-step to synthesize information from all completed tasks and tool outputs.
  - Reference all relevant context and results to ensure completeness and avoid omissions.
  - For open-ended or research-focused requests, prioritize thoroughness, synthesis, and quality over speed.
  - For requests with a clear, binary goal, focus on direct completion and clarity.

  Tool Usage:
  - You have access to the following tools and their descriptions. Use them to retrieve additional details or clarify information if needed.
  - Only call tools when their use is justified and required for a more complete or accurate response.

  Workflow Steps:
  1. Review all completed tasks and their results.
  2. Identify key findings, insights, and actionable information.
  3. If synthesis/compilation steps exist, use their outputs as your main source.
  4. If data is incomplete, use what's available and clearly indicate any gaps.
  5. Organize information for usefulness and clarity, using markdown formatting if appropriate.
  6. Make actionable recommendations if relevant.
  7. After synthesizing, self-evaluate the response for completeness and quality. Iterate if necessary.

  User Request:
  ${this.prompt}

  Completed Tasks and Results:
  ${taskContext}

  Now synthesize this into a comprehensive, cohesive response that directly and completely answers the user's request.`;

    log(this.tools);

    const result = await generateText({
      model: this.model,
      prompt: systemPrompt,
      tools: this.tools,
    });

    return (
      result.text.trim() || "No response was produced by the synthesis agent."
    );
  }

  // not used - stub method
  async onUserMessage() {}
}
