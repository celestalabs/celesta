export type MessageType = "status" | "question" | "info" | "error" | "final";

export interface Message {
  type: MessageType;
  content: string;
  timestamp: Date;
  sender: string; // e.g., "CoordinationAgent", "ExecutionAgent", etc.
}

/**
 * Generic MessagePipe interface for agent-to-human communication.
 * Implementations can use console, WebSocket, HTTP, or any other transport.
 */
export interface IMessagePipe {
  /**
   * Send a message through the pipe
   */
  send(type: MessageType, content: string, sender: string): void;

  /**
   * Ask a question and wait for user response
   */
  ask(question: string, sender: string): Promise<string>;

  /**
   * Get all messages sent through the pipe
   */
  getMessages(): Message[];

  /**
   * Close/cleanup the message pipe
   */
  close(): void;
}