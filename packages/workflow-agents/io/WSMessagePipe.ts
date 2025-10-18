import { WebSocket, RawData } from "ws";
import { IMessagePipe, MessageType, Message } from "./IMessagePipe.js";

interface WSMessage {
  id: string;
  type: MessageType | "answer";
  content: string;
  sender: string;
  timestamp: Date;
  isQuestion?: boolean;
}

interface PendingQuestion {
  resolve: (answer: string) => void;
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
  private messageHandler: ((data: RawData) => void) | null = null;
  private askTimeout: number = 300000; // 5 minutes default timeout

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
    });

    // Handle connection errors
    this.ws.on("error", (error) => {
      this.rejectAllPendingQuestions(error);
    });
  }

  /**
   * Send a message through the WebSocket
   */
  send(type: MessageType, content: string, sender: string): void {
    const message: Message = {
      type,
      content,
      timestamp: new Date(),
      sender,
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
        isQuestion: false,
      };

      this.ws.send(JSON.stringify(wsMessage));
    } else {
      console.warn(
        `[WSMessagePipe] Cannot send message, WebSocket is not open (state: ${this.ws.readyState})`
      );
    }
  }

  /**
   * Ask a question and wait for user response via WebSocket
   */
  async ask(question: string, sender: string): Promise<string> {
    // Store the question in message history
    this.send("question", question, sender);

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
   * Get all messages sent through the pipe
   */
  getMessages(): Message[] {
    return [...this.messages];
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
    }

    // Set up new WebSocket
    this.ws = newWs;
    this.messageHandler = this.handleIncomingMessage.bind(this);
    this.ws.on("message", this.messageHandler);

    // Handle connection close
    this.ws.on("close", () => {
      this.rejectAllPendingQuestions(new Error("WebSocket connection closed"));
    });

    // Handle connection errors
    this.ws.on("error", (error) => {
      this.rejectAllPendingQuestions(error);
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

    // Reject all pending questions
    this.rejectAllPendingQuestions(new Error("MessagePipe closed"));

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
   * Generate a unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
