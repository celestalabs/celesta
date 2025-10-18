/**
 * Celesta Workflow Automation Framework
 *
 * This is the main entry point that orchestrates complex task execution
 * using AI agents and tools.
 */

import { CoordinationAgent } from "./agents/CoordinationAgent";
import { ExecutionContext } from "./components/ExecutionContext";
import { IMessagePipe } from "./io/IMessagePipe";
import { ToolFilterAgent } from "./agents/ToolFilterAgent";
import { ExecutionAgent } from "./agents/ExecutionAgent";
import { SynthesisAgent } from "./agents/SynthesisAgent";

/**
 * Main orchestration function that manages the workflow execution loop
 */
export async function executeComplexTask(
  prompt: string,
  messagePipe: IMessagePipe
) {
  const executionContext = new ExecutionContext({ prompt, messagePipe });
  const coordinationAgent = new CoordinationAgent({ executionContext });
  const toolFilterAgent = new ToolFilterAgent({ executionContext });
  const executionAgent = new ExecutionAgent({ executionContext });
  const synthesisAgent = new SynthesisAgent({ executionContext });

  messagePipe.send("status", "Starting workflow execution...", "System");

  try {
    while (executionContext.getCompletionStatus() === "running") {
      const nextTask = await coordinationAgent.nextTask();

      // Check if we're done (coordination agent marks context as completed)
      if (executionContext.getCompletionStatus() !== "running") {
        break;
      }

      console.log(`\n${"=".repeat(60)}`);
      console.log(`Next task: ${nextTask.description}`);
      console.log(`${"=".repeat(60)}\n`);

      const tools = await toolFilterAgent.run({ task: nextTask });
      const result = await executionAgent.run({ task: nextTask, tools });

      console.log(`\n📋 Task result: ${result.output}\n`);
    }

    if (executionContext.getCompletionStatus() === "completed") {
      console.log("\n" + "=".repeat(60));
      console.log("✅ All tasks completed successfully!");
      console.log("=".repeat(60) + "\n");

      // Generate and send cohesive final response using SynthesisAgent
      const finalResponse = await synthesisAgent.synthesize();
      console.log("📊 Final Response:\n");
      console.log(finalResponse);
    } else {
      console.log("\n" + "=".repeat(60));
      console.log("❌ Task execution failed.");
      console.log("=".repeat(60) + "\n");
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    messagePipe.send("error", `Critical error: ${errorMsg}`, "System");
    executionContext.markAsFailed(errorMsg);
  }
}
