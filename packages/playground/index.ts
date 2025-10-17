import * as readline from "readline";
import { ConsoleMessagePipe } from "./components/ConsoleMessagePipe";
import { executeComplexTask } from "./executor";

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

  const messagePipe = new ConsoleMessagePipe();

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
