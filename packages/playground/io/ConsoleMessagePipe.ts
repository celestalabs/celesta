import * as readline from "readline";
import { IMessagePipe, Message, MessageType } from "./IMessagePipe";

/**
 * Console-based implementation of MessagePipe.
 * Logs to console and prompts for user input using readline.
 */
export class ConsoleMessagePipe implements IMessagePipe {
  private messages: Message[] = [];
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  /**
   * Send a message through the pipe (logs to console)
   */
  send(type: MessageType, content: string, sender: string): void {
    const message: Message = {
      type,
      content,
      timestamp: new Date(),
      sender,
    };
    this.messages.push(message);

    // Format the console output
    const prefix = this.getPrefix(type);
    console.log(`${prefix}[${sender}] ${content}`);
  }

  /**
   * Ask a question and wait for user response
   */
  async ask(question: string, sender: string): Promise<string> {
    this.send("question", question, sender);

    return new Promise((resolve) => {
      this.rl.question(`\n> Your answer: `, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  /**
   * Get all messages sent through the pipe
   */
  getMessages(): Message[] {
    return [...this.messages];
  }

  /**
   * Close the message pipe (cleanup readline interface)
   */
  close(): void {
    this.rl.close();
  }

  private getPrefix(type: MessageType): string {
    switch (type) {
      case "status":
        return "📊 ";
      case "question":
        return "❓ ";
      case "info":
        return "ℹ️  ";
      case "error":
        return "❌ ";
      default:
        return "  ";
    }
  }
}
