import { generateText } from "ai";
import { BaseAgent, BaseAgentConfig } from "./BaseAgent.js";

/**
 * SynthesisAgent generates a cohesive final response based on all completed tasks.
 * It takes the original user prompt and all task outputs, then synthesizes them
 * into a natural, unified answer that directly addresses what the user asked for.
 */
export class SynthesisAgent extends BaseAgent {
  protected agentName = "SynthesisAgent";

  constructor(config: BaseAgentConfig) {
    super(config);
  }

  /**
   * Generate a cohesive final response by synthesizing all task outputs
   */
  async synthesize(): Promise<string> {
    try {
      this.sendStatus("Generating final response...");

      const prompt = this.getPrompt();
      const allTaskData = this.getPreviousTaskData();

      // Build context from all completed tasks
      const taskContext = allTaskData
        .map((task: any, index: number) => {
          return `Task ${index + 1}: ${task.description}\nResult: ${task.output}`;
        })
        .join("\n\n");

      const systemPrompt = `You are an autonomous synthesis agent that generates cohesive, natural responses.

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
${prompt}

Completed Tasks and Their Results:
${taskContext}

Now synthesize this into a comprehensive, cohesive response that directly and completely answers the user's request.`;

      const result = await generateText({
        model: this.model,
        prompt: systemPrompt,
      });

      const finalResponse = result.text.trim();

      if (!finalResponse) {
        throw new Error("Synthesis agent produced empty response");
      }

      // Send the final response to the user
      this.sendFinal(finalResponse);

      return finalResponse;
    } catch (error) {
      return this.handleError(error, "Failed to generate final response");
    }
  }
}
