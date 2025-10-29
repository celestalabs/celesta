import { generateText, ToolSet } from "ai";
import { MessageContext } from "../../components/messageContext.js";
import { BaseAgent } from "../BaseAgent.js";
import { WorkflowTaskResult } from "@celesta/types";

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

    const systemPrompt = `You are an autonomous synthesis agent that generates cohesive, natural responses.

Current Date: ${dateString}

Your job is to take the results from multiple completed tasks and synthesize them into a single, unified response that directly answers the user's original question or request.

AUTONOMY PRINCIPLES:
- Provide COMPLETE, ACTIONABLE information without asking for clarification
- When presenting options or choices, include ALL relevant details to help decision-making
- Organize information in the most useful way for the user
- If data seems incomplete, work with what's available rather than noting gaps
- Make your response immediately useful and comprehensive

CRITICAL GUIDELINES:
1. DO NOT list tasks or describe what was done - the user doesn't care about the process
2. DO provide a direct, natural answer to their question using the task results
3. Use a conversational, helpful tone as if you're directly answering them
4. Combine information from multiple tasks seamlessly
5. If the user asked for a summary, provide a comprehensive summary - not a list of tasks
6. If the user asked for research, provide synthesized findings - not task descriptions
7. Format your response in a clear, readable way (use markdown if appropriate)
8. Include ALL relevant information, not just highlights - be thorough
9. Present information in order of importance or logical flow
10. Make actionable recommendations when appropriate

Original User Request:
${this.prompt}

Completed Tasks and Their Results:
${taskContext}

Now synthesize this into a comprehensive, cohesive response that directly and completely answers the user's request.`;

    const result = await generateText({
      model: this.model,
      prompt: systemPrompt,
      tools: this.tools,
    });

    return result.text.trim() || "No response was produced by the synthesis agent.";
  }

  // not used - stub method
  async onUserMessage() {}
}
