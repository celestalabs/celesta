import { WebSocket, RawData } from "ws";
import { IMessagePipe, MessageType, Message } from "./IMessagePipe.js";

// Discriminated union for WebSocket messages
export type WSMessage =
  | {
      id: string;
      type: "status" | "info" | "error" | "final";
      content: string;
      sender: string;
      timestamp: Date;
      workflowId?: string;
    }
  | {
      id: string;
      type: "question";
      content: string;
      sender: string;
      timestamp: Date;
      isQuestion: true;
      workflowId?: string;
    }
  | {
      id: string;
      type: "request_credentials";
      content: string;
      sender: string;
      timestamp: Date;
      integrationName: string;
      workflowId?: string;
    }
  | {
      id: string;
      type: "provide_credentials";
      content: string;
      sender: string;
      timestamp: Date;
      integrationName: string;
      accessToken: string;
      workflowId?: string;
    }
  | {
      id: string;
      type: "tool_invocation";
      content: string;
      sender: string;
      timestamp: Date;
      toolCallId: string;
      toolName: string;
      toolArgs: any;
      workflowId?: string;
    }
  | {
      id: string;
      type: "tool_result";
      content: string;
      sender: string;
      timestamp: Date;
      toolCallId: string;
      toolName: string;
      toolResult: any;
      workflowId?: string;
    }
  | {
      id: string;
      type: "answer";
      content: string;
      sender: string;
      timestamp: Date;
      workflowId?: string;
    }
  | {
      id: string;
      type: "chat_message";
      content: string;
      sender: string;
      timestamp: Date;
    }
  | {
      id: string;
      type: "chat_response";
      content: string;
      sender: string;
      timestamp: Date;
    }
  | {
      id: string;
      type: "workflow_intent_detected";
      content: string;
      sender: string;
      timestamp: Date;
      suggestedPrompt: string;
      confidence: "high" | "medium" | "low";
      reasoning: string;
    }
  | {
      id: string;
      type: "workflow_started";
      content: string;
      sender: string;
      timestamp: Date;
      workflowId: string;
      prompt: string;
      hasNavButton: boolean;
    }
  | {
      id: string;
      type: "start_workflow";
      content: string;
      sender: string;
      timestamp: Date;
      prompt: string;
    };

interface PendingQuestion {
  resolve: (answer: string) => void;
  reject: (error: Error) => void;
  timeoutId: NodeJS.Timeout;
}

interface PendingCredentialRequest {
  resolve: (accessToken: string) => void;
  reject: (error: Error) => void;
  timeoutId: NodeJS.Timeout;
}

/**
 * WebSocket-based implementation of MessagePipe.
 * Enables bidirectional communication with a frontend client over WebSocket.
 */
export class WSMessagePipe implements IMessagePipe {
  private messages: Message[] = [];
  private ws: WebSocket;
  private pendingQuestions: Map<string, PendingQuestion> = new Map();
  private pendingCredentialRequests: Map<string, PendingCredentialRequest> =
    new Map();
  private credentialCache: Map<string, string> = new Map();
  private messageHandler: ((data: RawData) => void) | null = null;
  private askTimeout: number = 300000; // 5 minutes default timeout
  private toolCallCounter: number = 0;

  constructor(ws: WebSocket, askTimeout?: number) {
    this.ws = ws;
    if (askTimeout !== undefined) {
      this.askTimeout = askTimeout;
    }

    // Set up message listener for incoming responses
    this.messageHandler = this.handleIncomingMessage.bind(this);
    this.ws.on("message", this.messageHandler);

    // Handle connection close
    this.ws.on("close", () => {
      this.rejectAllPendingQuestions(new Error("WebSocket connection closed"));
      this.rejectAllPendingCredentialRequests(
        new Error("WebSocket connection closed")
      );
    });

    // Handle connection errors
    this.ws.on("error", (error) => {
      this.rejectAllPendingQuestions(error);
      this.rejectAllPendingCredentialRequests(error);
    });
  }

  /**
   * Send a message through the WebSocket
   */
  send(type: MessageType, content: string, sender: string, workflowId?: string): void {
    const message: Message = {
      type,
      content,
      timestamp: new Date(),
      sender,
      workflowId,
    };
    this.messages.push(message);

    // Send to client if connection is open
    if (this.ws.readyState === WebSocket.OPEN) {
      const wsMessage: WSMessage = {
        id: this.generateMessageId(),
        type,
        content,
        sender,
        timestamp: message.timestamp,
        ...(workflowId && { workflowId }),
      } as WSMessage;

      this.ws.send(JSON.stringify(wsMessage));
    }
    // If connection is closed, message is still stored in history
    // for retrieval when client reconnects (autonomous workflow mode)
  }

  /**
   * Ask a question and wait for user response via WebSocket
   */
  async ask(question: string, sender: string, workflowId?: string): Promise<string> {
    // Store the question in message history
    this.send("question", question, sender, workflowId);

    // Check connection state
    if (this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket connection is not open");
    }

    // Create unique ID for this question
    const messageId = this.generateMessageId();

    // Create the question message
    const wsMessage: WSMessage = {
      id: messageId,
      type: "question",
      content: question,
      sender,
      timestamp: new Date(),
      isQuestion: true,
      ...(workflowId && { workflowId }),
    };

    // Send the question
    this.ws.send(JSON.stringify(wsMessage));

    // Return a promise that resolves when the answer arrives
    return new Promise<string>((resolve, reject) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        this.pendingQuestions.delete(messageId);
        reject(
          new Error(
            `Question timed out after ${this.askTimeout / 1000} seconds: "${question}"`
          )
        );
      }, this.askTimeout);

      // Store the promise resolvers
      this.pendingQuestions.set(messageId, {
        resolve,
        reject,
        timeoutId,
      });
    });
  }

  /**
   * Request OAuth credentials for a specific integration.
   * Credentials are cached per session to avoid repeated OAuth flows.
   */
  async requestCredentials(integrationName: string, workflowId?: string): Promise<string> {
    // Check cache first
    if (this.credentialCache.has(integrationName)) {
      console.log(
        `[WSMessagePipe] Using cached credentials for ${integrationName}`
      );
      return this.credentialCache.get(integrationName)!;
    }

    // Check connection state
    if (this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket connection is not open");
    }

    // Create unique ID for this credential request
    const messageId = this.generateMessageId();

    // Send credential request message
    const wsMessage: WSMessage = {
      id: messageId,
      type: "request_credentials",
      content: `Requesting credentials for ${integrationName}`,
      sender: "System",
      timestamp: new Date(),
      integrationName,
      ...(workflowId && { workflowId }),
    };

    this.ws.send(JSON.stringify(wsMessage));

    console.log(
      `[WSMessagePipe] Sent credential request for ${integrationName}`
    );

    // Return a promise that resolves when credentials arrive
    return new Promise<string>((resolve, reject) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        this.pendingCredentialRequests.delete(messageId);
        reject(
          new Error(
            `Credential request timed out after ${this.askTimeout / 1000} seconds for integration: ${integrationName}`
          )
        );
      }, this.askTimeout);

      // Store the promise resolvers
      this.pendingCredentialRequests.set(messageId, {
        resolve: (accessToken: string) => {
          // Cache the credential
          this.credentialCache.set(integrationName, accessToken);
          resolve(accessToken);
        },
        reject,
        timeoutId,
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
   * Send a tool invocation message with a unique ID
   */
  sendToolInvocation(toolCallId: string, toolName: string, args: any, sender: string, workflowId?: string): void {
    const message: Message = {
      type: "tool_invocation",
      content: `Calling ${toolName}`,
      timestamp: new Date(),
      sender,
      workflowId,
    };
    this.messages.push(message);

    if (this.ws.readyState === WebSocket.OPEN) {
      const wsMessage: WSMessage = {
        id: this.generateMessageId(),
        type: "tool_invocation",
        content: `Calling ${toolName}`,
        sender,
        timestamp: message.timestamp,
        toolCallId,
        toolName,
        toolArgs: args,
        ...(workflowId && { workflowId }),
      };
      this.ws.send(JSON.stringify(wsMessage));
    }
  }

  /**
   * Send a tool result message matching the invocation ID
   */
  sendToolResult(toolCallId: string, toolName: string, result: any, sender: string, workflowId?: string): void {
    const message: Message = {
      type: "tool_result",
      content: `Result from ${toolName}`,
      timestamp: new Date(),
      sender,
      workflowId,
    };
    this.messages.push(message);

    if (this.ws.readyState === WebSocket.OPEN) {
      const wsMessage: WSMessage = {
        id: this.generateMessageId(),
        type: "tool_result",
        content: `Result from ${toolName}`,
        sender,
        timestamp: message.timestamp,
        toolCallId,
        toolName,
        toolResult: result,
        ...(workflowId && { workflowId }),
      };
      this.ws.send(JSON.stringify(wsMessage));
    }
  }

  /**
   * Reconnect with a new WebSocket connection.
   * Preserves message history and cleans up the old connection.
   * Optionally reject or keep pending questions.
   */
  reconnect(newWs: WebSocket, rejectPendingQuestions: boolean = true): void {
    // Remove listener from old WebSocket
    if (this.messageHandler) {
      this.ws.off("message", this.messageHandler);
      this.ws.off("close", () => {});
      this.ws.off("error", () => {});
    }

    // Close old WebSocket if still open
    if (
      this.ws.readyState === WebSocket.OPEN ||
      this.ws.readyState === WebSocket.CONNECTING
    ) {
      this.ws.close();
    }

    // Optionally reject pending questions from old connection
    if (rejectPendingQuestions) {
      this.rejectAllPendingQuestions(
        new Error("WebSocket reconnected - previous connection closed")
      );
      this.rejectAllPendingCredentialRequests(
        new Error("WebSocket reconnected - previous connection closed")
      );
    }

    // Set up new WebSocket
    this.ws = newWs;
    this.messageHandler = this.handleIncomingMessage.bind(this);
    this.ws.on("message", this.messageHandler);

    // Handle connection close
    this.ws.on("close", () => {
      this.rejectAllPendingQuestions(new Error("WebSocket connection closed"));
      this.rejectAllPendingCredentialRequests(
        new Error("WebSocket connection closed")
      );
    });

    // Handle connection errors
    this.ws.on("error", (error) => {
      this.rejectAllPendingQuestions(error);
      this.rejectAllPendingCredentialRequests(error);
    });
  }

  /**
   * Close the WebSocket connection and cleanup
   */
  close(): void {
    // Remove message listener
    if (this.messageHandler) {
      this.ws.off("message", this.messageHandler);
      this.messageHandler = null;
    }

    // Reject all pending questions and credential requests
    this.rejectAllPendingQuestions(new Error("MessagePipe closed"));
    this.rejectAllPendingCredentialRequests(new Error("MessagePipe closed"));

    // Close WebSocket if still open
    if (
      this.ws.readyState === WebSocket.OPEN ||
      this.ws.readyState === WebSocket.CONNECTING
    ) {
      this.ws.close();
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleIncomingMessage(data: RawData): void {
    try {
      const rawMessage = data.toString();
      const message = JSON.parse(rawMessage) as WSMessage;

      // Check if this is an answer to a pending question
      if (message.type === "answer" && message.id) {
        const pending = this.pendingQuestions.get(message.id);

        if (pending) {
          // Clear the timeout
          clearTimeout(pending.timeoutId);

          // Remove from pending
          this.pendingQuestions.delete(message.id);

          // Resolve the promise
          pending.resolve(message.content);
        } else {
          console.warn(
            `[WSMessagePipe] Received answer for unknown question ID: ${message.id}`
          );
        }
      }
      // Check if this is a credential response
      else if (message.type === "provide_credentials" && message.id) {
        const pending = this.pendingCredentialRequests.get(message.id);

        if (pending && message.accessToken) {
          // Clear the timeout
          clearTimeout(pending.timeoutId);

          // Remove from pending
          this.pendingCredentialRequests.delete(message.id);

          // Resolve the promise (which will also cache the credential)
          pending.resolve(message.accessToken);

          console.log(
            `[WSMessagePipe] Received credentials for ${message.integrationName}`
          );
        } else if (pending && !message.accessToken) {
          // Clear the timeout
          clearTimeout(pending.timeoutId);

          // Remove from pending
          this.pendingCredentialRequests.delete(message.id);

          // Reject the promise
          pending.reject(
            new Error(
              `No access token provided for integration: ${message.integrationName}`
            )
          );
        } else {
          console.warn(
            `[WSMessagePipe] Received credentials for unknown request ID: ${message.id}`
          );
        }
      }
    } catch (error) {
      console.error("[WSMessagePipe] Failed to parse incoming message:", error);
    }
  }

  /**
   * Reject all pending questions with the given error
   */
  private rejectAllPendingQuestions(error: Error): void {
    for (const [messageId, pending] of this.pendingQuestions.entries()) {
      clearTimeout(pending.timeoutId);
      pending.reject(error);
    }
    this.pendingQuestions.clear();
  }

  /**
   * Reject all pending credential requests with the given error
   */
  private rejectAllPendingCredentialRequests(error: Error): void {
    for (const [messageId, pending] of this.pendingCredentialRequests.entries()) {
      clearTimeout(pending.timeoutId);
      pending.reject(error);
    }
    this.pendingCredentialRequests.clear();
  }

  /**
   * Generate a unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
