/**
 * Celesta Workflow Automation Framework
 *
 * This is the main entry point that orchestrates complex task execution
 * using AI agents and tools.
 */

import { CoordinationAgent } from "../agents/CoordinationAgent.js";
import { ExecutionContext } from "./ExecutionContext.js";
import { IMessagePipe } from "../io/IMessagePipe.js";
import { ToolFilterAgent } from "../agents/ToolFilterAgent.js";
import { ExecutionAgent } from "../agents/ExecutionAgent.js";
import { SynthesisAgent } from "../agents/SynthesisAgent.js";
import { loadToolsFromAPI } from "./dynamicTools.js";

/**
 * Main orchestration function that manages the workflow execution loop
 */
export async function executeComplexTask(
  prompt: string,
  messagePipe: IMessagePipe,
  apiBaseUrl: string = "http://localhost:8080"
) {
  messagePipe.send("status", "Loading tools from integrations API...", "System");

  // Create execution context first (needed for system tools)
  const executionContext = new ExecutionContext({
    prompt,
    messagePipe,
    tools: {}, // Will be updated after loading
    toolMetadata: [],
    integrationMetadata: {} as any,
  });

  // Load tools dynamically from the integrations API
  let toolsData;
  try {
    toolsData = await loadToolsFromAPI(apiBaseUrl, messagePipe, executionContext);
    
    // Update execution context with loaded tools
    (executionContext as any).tools = toolsData.tools;
    (executionContext as any).toolMetadata = toolsData.metadata;
    (executionContext as any).integrationMetadata = toolsData.integrationMetadata;
    
    messagePipe.send(
      "info",
      `Loaded ${Object.keys(toolsData.tools).length} tools from ${toolsData.metadata.length} actions`,
      "System"
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    messagePipe.send("error", `Failed to load tools: ${errorMsg}`, "System");
    throw error;
  }

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
      
      // Check if task failed due to rate limiting - stop workflow immediately
      if (result.isRateLimitError) {
        messagePipe.send("error", result.error || "Rate limit exceeded", "System");
        executionContext.markAsFailed(result.error || "Rate limit exceeded");
        console.log("\n" + "=".repeat(60));
        console.log("⚠️  Workflow stopped due to rate limiting");
        console.log("=".repeat(60) + "\n");
        break;
      }
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
