/*
  The session manager keeps track of connected clients and their context.
  For a given client ID, we manage:
  - Message pipe for communication
  - Chat agent with loaded tools
  - Chat history for context
  - Active workflows
  - Chat tools (loaded once, shared across all clients)
*/

import { IMessagePipe } from "../io/IMessagePipe.js";
import { ChatAgent, type ChatMessage } from "../agents/ChatAgent.js";
import { ExecutionContext } from "./ExecutionContext.js";
import { loadChatToolsFromAPI } from "./dynamicTools.js";
import { ToolSet } from "ai";

interface WorkflowExecution {
  workflowId: string;
  prompt: string;
  executionContext: ExecutionContext | null;
  status: "running" | "completed" | "failed";
  startedAt: Date;
}

interface ClientSession {
  clientId: string;
  messagePipe: IMessagePipe;
  chatAgent: ChatAgent;
  chatHistory: ChatMessage[];
  activeWorkflows: Map<string, WorkflowExecution>;
}

export class SessionManager {
  private static instance: SessionManager;
  private sessions: Map<string, ClientSession>;
  private chatToolsCache: ToolSet | undefined;
  private chatToolsLoadingPromise: Promise<ToolSet> | undefined;
  private integrationsApiUrl: string;

  private constructor(integrationsApiUrl: string) {
    this.sessions = new Map();
    this.integrationsApiUrl = integrationsApiUrl;
  }

  public static getInstance(integrationsApiUrl?: string): SessionManager {
    if (!SessionManager.instance) {
      if (!integrationsApiUrl) {
        throw new Error("SessionManager must be initialized with integrationsApiUrl");
      }
      SessionManager.instance = new SessionManager(integrationsApiUrl);
    }
    return SessionManager.instance;
  }

  /**
   * Load chat tools from the integrations API.
   * Tools are cached after first load and shared across all clients.
   */
  public async loadChatTools(messagePipe: IMessagePipe): Promise<ToolSet> {
    // Return cached tools if available
    if (this.chatToolsCache) {
      return this.chatToolsCache;
    }

    // If already loading, wait for that promise
    if (this.chatToolsLoadingPromise) {
      return this.chatToolsLoadingPromise;
    }

    // Start loading tools
    console.log("[SessionManager] Loading chat-compatible tools from integrations API...");
    this.chatToolsLoadingPromise = loadChatToolsFromAPI(this.integrationsApiUrl, messagePipe)
      .then((tools) => {
        this.chatToolsCache = tools;
        const toolCount = Object.keys(tools).length;
        console.log(`[SessionManager] Loaded ${toolCount} chat-compatible tools`);
        return tools;
      })
      .catch((error) => {
        console.error("[SessionManager] Failed to load chat tools:", error);
        this.chatToolsLoadingPromise = undefined; // Reset on error so it can retry
        return {}; // Return empty toolset on error
      });

    return this.chatToolsLoadingPromise;
  }

  public createSession(
    clientId: string,
    messagePipe: IMessagePipe,
    tools?: ToolSet
  ): void {
    const chatAgent = new ChatAgent({ messagePipe });
    if (tools) {
      chatAgent.setTools(tools);
    }

    this.sessions.set(clientId, {
      clientId,
      messagePipe,
      chatAgent,
      chatHistory: [],
      activeWorkflows: new Map(),
    });
  }

  public getSession(clientId: string): ClientSession | undefined {
    return this.sessions.get(clientId);
  }

  public deleteSession(clientId: string): void {
    const session = this.sessions.get(clientId);
    if (session) {
      session.messagePipe.close();
      this.sessions.delete(clientId);
    }
  }

  public getMessagePipe(clientId: string): IMessagePipe | undefined {
    return this.sessions.get(clientId)?.messagePipe;
  }

  public getChatAgent(clientId: string): ChatAgent | undefined {
    return this.sessions.get(clientId)?.chatAgent;
  }

  public getChatHistory(clientId: string): ChatMessage[] {
    return this.sessions.get(clientId)?.chatHistory || [];
  }

  public addChatMessage(
    clientId: string,
    role: "user" | "assistant",
    content: string
  ): void {
    const session = this.sessions.get(clientId);
    if (session) {
      session.chatHistory.push({
        role,
        content,
        timestamp: new Date(),
      });
    }
  }

  public getActiveWorkflows(
    clientId: string
  ): Map<string, WorkflowExecution> | undefined {
    return this.sessions.get(clientId)?.activeWorkflows;
  }

  public addWorkflow(
    clientId: string,
    workflowId: string,
    prompt: string
  ): void {
    const session = this.sessions.get(clientId);
    if (session) {
      session.activeWorkflows.set(workflowId, {
        workflowId,
        prompt,
        executionContext: null,
        status: "running",
        startedAt: new Date(),
      });
    }
  }

  public updateWorkflowStatus(
    clientId: string,
    workflowId: string,
    status: "running" | "completed" | "failed"
  ): void {
    const session = this.sessions.get(clientId);
    if (session) {
      const workflow = session.activeWorkflows.get(workflowId);
      if (workflow) {
        workflow.status = status;
      }
    }
  }
}
