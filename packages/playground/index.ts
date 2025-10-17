/**
 * Celesta Workflow Automation Framework
 * 
 * This is the main entry point that orchestrates complex task execution
 * using AI agents and tools.
 */

import "dotenv/config";
import * as readline from "readline";
import {
  ExecutionContext,
  CoordinationAgent,
  ToolFilterAgent,
  ExecutionAgent,
  MessagePipe,
} from "./components/index.js";

/**
 * Main orchestration function that manages the workflow execution loop
 */
async function executeComplexTask(prompt: string, messagePipe: MessagePipe) {
  const executionContext = new ExecutionContext({ prompt, messagePipe });
  const coordinationAgent = new CoordinationAgent({ executionContext });
  const toolFilterAgent = new ToolFilterAgent({ executionContext });
  const executionAgent = new ExecutionAgent({ executionContext });

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
      
      // Generate and display cohesive response
      const finalResponse = executionContext.generateCohesiveResponse();
      console.log("📊 Final Summary:\n");
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

/**
 * Get initial prompt from user
 */
async function getInitialPrompt(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    console.log("\n" + "=".repeat(60));
    console.log("🌟 Celesta Workflow Automation Framework");
    console.log("=".repeat(60) + "\n");
    
    rl.question("Enter your complex task or question:\n> ", (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Main entry point
 */
async function main() {
  const prompt = await getInitialPrompt();
  
  if (!prompt) {
    console.log("No prompt provided. Exiting.");
    return;
  }

  const messagePipe = new MessagePipe();

  try {
    await executeComplexTask(prompt, messagePipe);
  } finally {
    messagePipe.close();
  }
}

// Run the application
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
