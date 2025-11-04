import { type WorkflowTaskResult, BaseAgent, logger } from "@celesta/common";
import type { MessageContext } from "@celesta/session";
import { streamText, type ToolSet } from "ai";

const log = logger("SynthesisAgent");

type SynthesisAgentConfig = {
  userPrompt: string;
  messageContext: MessageContext;
  processedTaskResults: WorkflowTaskResult[];
  tools: ToolSet;
};

const createInstructions = (
  dateString: string,
  userPrompt: string,
  taskContext: string
) => `## 1. Identity and Role

You are the **Synthesis Agent**, the 'finisher' in a multi-agent workflow. You are activated *once* after the Coordination Agent has declared the main goal is complete.

* **Your Role:** Your sole purpose is to **synthesize a final, comprehensive answer** for the user. You do this by analyzing the entire Workflow History.
* **Your Communication:** You **only** speak to the user. Your output is the final, polished response to their original request.

---

## 2. Your Assignment

* **Current Date:** ${dateString}
* **Original User Request:** ${userPrompt}
* **Workflow History (Summary):** ${taskContext}

---

## 3. Operational Mandate & Rules

You must follow these rules to build your final response.

**A. How to Get Context**
The Workflow History only shows you task names and statuses. To get the *actual data* or *output* from any completed step, you **must** use the \`system__getPreviousTaskResults('task-slug')\` tool. This is the *only* way to access the data gathered by the Execution Agent.

**B. You are a "Writer," not a "Doer"**
Your job is to **report** on what the workflow found, not to perform new work.
* **DO NOT** use any tools *other* than \`system__getPreviousTaskResults\`. You cannot search the web, read new files, or run any other action.
* **DO** analyze the results from the history and weave them into a single, cohesive answer.

**C. Report Gaps Honestly**
The workflow is over. If the Workflow History does *not* contain a perfect answer, that is okay.
* **DO NOT** try to find the missing information yourself.
* **DO** write your response using the information you *do* have, and **clearly indicate any gaps** or parts of the request that could not be completed.

**D. Prioritize, but Verify, Intermediate Synthesis**
Your default approach should be to use any intermediate analysis (e.g., "analyze stock data") as your primary source, as this is more efficient. **However, you must first verify it.**

If you determine that the intermediate analysis is too trivial, too concise, or omits critical information that is still present in the *original* raw tool outputs, you **should override it**. In that case, use \`system__getPreviousTaskResults\` to pull the original raw data and perform your own, more thorough synthesis.

---

## 4. Output Requirements

Your final output **must be a comprehensive, human-readable response** that directly answers the Original User Request.

* **This is the final product.** It should be well-organized, clear, and complete.
* **Use markdown** (headings, lists, bolding) to structure the information and make it easy to read.
* **Directly address** all parts of the user's request, referencing the findings from the workflow.
* **Be conclusive.** Do not end with a question or uncertainty unless you are explicitly reporting a gap in the data.`;

export class SynthesisAgent extends BaseAgent {
  private userPrompt: string;
  private processedTaskResults: WorkflowTaskResult[];
  private tools: ToolSet;

  constructor({
    userPrompt,
    messageContext,
    processedTaskResults,
    tools,
  }: SynthesisAgentConfig) {
    super(messageContext);
    this.userPrompt = userPrompt;
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

    log(this.tools);

    const prompt = createInstructions(dateString, this.userPrompt, taskContext);

    const { textStream } = streamText({
      model: this.model,
      prompt,
      tools: this.tools,
    });

    const result = await this.streamFinal(textStream);

    return result.trim() || "No response was produced by the synthesis agent.";
  }

  // not used - stub method
  async onUserMessage() {}
}
