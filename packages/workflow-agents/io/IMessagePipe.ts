export type MessageType = 
  | "status" 
  | "question" 
  | "info" 
  | "error" 
  | "final" 
  | "request_credentials" 
  | "provide_credentials" 
  | "tool_invocation" 
  | "tool_result"
  | "chat_message"
  | "chat_response"
  | "workflow_intent_detected"
  | "workflow_started"
  | "start_workflow";

export interface Message {
  type: MessageType;
  content: string;
  timestamp: Date;
  sender: string; // e.g., "CoordinationAgent", "ExecutionAgent", etc.
  workflowId?: string; // Optional workflow identifier for routing
}

/**
 * Generic MessagePipe interface for agent-to-human communication.
 * Implementations can use console, WebSocket, HTTP, or any other transport.
 */
export interface IMessagePipe {
  /**
   * Send a message through the pipe
   */
  send(type: MessageType, content: string, sender: string, workflowId?: string): void;

  /**
   * Ask a question and wait for user response
   */
  ask(question: string, sender: string, workflowId?: string): Promise<string>;

  /**
   * Request OAuth credentials for a specific integration.
   * The implementation should handle the OAuth flow and return the access token.
   * Credentials are cached per session to avoid repeated OAuth flows.
   */
  requestCredentials(integrationName: string, workflowId?: string): Promise<string>;

  /**
   * Send a tool invocation message with a unique ID
   */
  sendToolInvocation(toolCallId: string, toolName: string, args: any, sender: string, workflowId?: string): void;

  /**
   * Send a tool result message matching the invocation ID
   */
  sendToolResult(toolCallId: string, toolName: string, result: any, sender: string, workflowId?: string): void;

  /**
   * Get all messages sent through the pipe
   */
  getMessages(): Message[];

  /**
   * Close/cleanup the message pipe
   */
  close(): void;
}