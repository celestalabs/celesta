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
import type { IntegrationName } from "@celesta/integrations-api/integrations/integrationName.js";
import type { IntegrationMetadata } from "@celesta/integrations-api/integrations/integrationMetadata.js";

/**
 * Main orchestration function that manages the workflow execution loop
 */
export async function executeComplexTask(
  prompt: string,
  messagePipe: IMessagePipe,
  apiBaseUrl: string = "http://localhost:8080",
  workflowId?: string,
  chatContext?: string
) {
  messagePipe.send("status", "Loading tools from integrations API...", "System", workflowId);

  // Create execution context first (needed for system tools)
  // We'll update tools and metadata after loading from API
  const executionContext = new ExecutionContext({
    prompt,
    messagePipe,
    tools: {},
    toolMetadata: [],
    integrationMetadata: {} as Record<IntegrationName, Omit<IntegrationMetadata, "actions">>,
    workflowId,
  });

  // Load tools dynamically from the integrations API
  let toolsData;
  try {
    toolsData = await loadToolsFromAPI(apiBaseUrl, messagePipe, executionContext);
    
    // Update execution context with loaded tools using setter methods
    executionContext.setTools(toolsData.tools);
    executionContext.setToolMetadata(toolsData.metadata);
    executionContext.setIntegrationMetadata(toolsData.integrationMetadata);
    
    messagePipe.send(
      "info",
      `Loaded ${Object.keys(toolsData.tools).length} tools from ${toolsData.metadata.length} actions`,
      "System",
      workflowId
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    messagePipe.send("error", `Failed to load tools: ${errorMsg}`, "System", workflowId);
    throw error;
  }

  const coordinationAgent = new CoordinationAgent({ executionContext, workflowId });
  const toolFilterAgent = new ToolFilterAgent({ executionContext, workflowId });
  const executionAgent = new ExecutionAgent({ executionContext, workflowId });
  const synthesisAgent = new SynthesisAgent({ executionContext, workflowId });

  // If chat context provided, inject it into the execution
  if (chatContext) {
    messagePipe.send("info", `Using chat context: ${chatContext}`, "System", workflowId);
    // Store context for agents to access
    executionContext.chatContext = chatContext;
  }

  messagePipe.send("status", "Starting workflow execution...", "System", workflowId);

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
        messagePipe.send("error", result.error || "Rate limit exceeded", "System", workflowId);
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
    messagePipe.send("error", `Critical error: ${errorMsg}`, "System", workflowId);
    executionContext.markAsFailed(errorMsg);
  }
}
