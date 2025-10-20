import React, { useRef, useEffect, useMemo, useState } from "react";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { ToolCallDisplay } from "./ToolCallDisplay";
import "../styles/MessagePanel.css";

export interface DisplayMessage {
  id: string;
  type: string;
  content: string;
  sender: string;
  timestamp: Date;
  toolCallId?: string;
  toolName?: string;
  toolArgs?: any;
  toolResult?: any;
  workflowId?: string;
  prompt?: string;
  hasNavButton?: boolean;
}

interface MessagePanelProps {
  messages: DisplayMessage[];
  onNavigateToWorkflow?: (workflowId: string) => void;
}

export const MessagePanel: React.FC<MessagePanelProps> = ({
  messages,
  onNavigateToWorkflow,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Group tool invocations with their results
  const toolCallMap = useMemo(() => {
    const map = new Map<string, DisplayMessage & { result?: DisplayMessage }>();

    messages.forEach((msg) => {
      if (msg.type === "tool_invocation" && msg.toolCallId) {
        map.set(msg.toolCallId, { ...msg });
      } else if (msg.type === "tool_result" && msg.toolCallId) {
        const invocation = map.get(msg.toolCallId);
        if (invocation) {
          invocation.result = msg;
        }
      }
    });

    return map;
  }, [messages]);

  const getMessageBackground = (type: string) => {
    switch (type) {
      case "error":
        return "#fee2e2";
      case "status":
        return "#e0e7ff";
      case "final":
        return "#d1fae5";
      default:
        return "white";
    }
  };

  const getMessageBorderColor = (type: string) => {
    switch (type) {
      case "error":
        return "#ef4444";
      case "status":
        return "#6366f1";
      case "final":
        return "#10b981";
      default:
        return "#9ca3af";
    }
  };

  const copyToClipboard = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(messageId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div
      style={{
        flex: 1,
        overflow: "auto",
        padding: "10px",
        background: "#f9fafb",
      }}
    >
      {messages.map((msg) => {
        // Skip tool_result messages as they're handled by tool_invocation
        if (msg.type === "tool_result") {
          return null;
        }

        // Render tool invocations with their results
        if (msg.type === "tool_invocation" && msg.toolCallId && msg.toolName) {
          const toolData = toolCallMap.get(msg.toolCallId);
          return (
            <ToolCallDisplay
              key={msg.id}
              toolCallId={msg.toolCallId}
              toolName={msg.toolName}
              toolArgs={msg.toolArgs}
              toolResult={toolData?.result?.toolResult}
              timestamp={msg.timestamp}
            />
          );
        }

        // Render workflow_started messages with navigation button
        if (
          msg.type === "workflow_started" &&
          msg.hasNavButton &&
          msg.workflowId &&
          onNavigateToWorkflow
        ) {
          return (
            <div
              key={msg.id}
              style={{
                marginBottom: "10px",
                padding: "12px",
                background: "#dbeafe",
                borderLeft: "4px solid #3b82f6",
                borderRadius: "4px",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  color: "#6b7280",
                  marginBottom: "8px",
                }}
              >
                <strong>{msg.sender}</strong> •{" "}
                {msg.timestamp.toLocaleTimeString()}
              </div>
              <div
                style={{
                  fontSize: "14px",
                  marginBottom: "12px",
                  color: "#1e40af",
                  fontWeight: "500",
                }}
              >
                {msg.content}
              </div>
              <button
                onClick={() => onNavigateToWorkflow(msg.workflowId!)}
                style={{
                  background: "#3b82f6",
                  color: "white",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#2563eb";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#3b82f6";
                }}
              >
                View Workflow →
              </button>
            </div>
          );
        }

        // Render regular messages
        return (
          <div
            key={msg.id}
            style={{
              marginBottom: "10px",
              padding: "8px",
              background: getMessageBackground(msg.type),
              borderLeft: `4px solid ${getMessageBorderColor(msg.type)}`,
              borderRadius: "4px",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                color: "#6b7280",
                marginBottom: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <strong>{msg.sender}</strong> • {msg.type} •{" "}
                {msg.timestamp.toLocaleTimeString()}
              </div>
              <button
                onClick={() => copyToClipboard(msg.content, msg.id)}
                title={copiedId === msg.id ? "Copied!" : "Copy markdown"}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  color: copiedId === msg.id ? "#10b981" : "#6b7280",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (copiedId !== msg.id) {
                    e.currentTarget.style.background = "#f3f4f6";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                {copiedId === msg.id ? "✓" : "📋"}
              </button>
            </div>
            <div
              style={{
                fontSize: "14px",
                lineHeight: "1.6",
              }}
              className="markdown-content"
            >
              <Markdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  // Style code blocks
                  code: ({ className, children, ...props }: any) => {
                    const inline = !className;
                    return inline ? (
                      <code
                        style={{
                          background: "#f3f4f6",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontSize: "13px",
                          fontFamily: "monospace",
                        }}
                        {...props}
                      >
                        {children}
                      </code>
                    ) : (
                      <pre
                        style={{
                          background: "#1f2937",
                          color: "#f9fafb",
                          padding: "12px",
                          borderRadius: "6px",
                          overflow: "auto",
                          marginTop: "8px",
                          marginBottom: "8px",
                        }}
                      >
                        <code
                          style={{
                            fontFamily: "monospace",
                            fontSize: "13px",
                          }}
                          {...props}
                        >
                          {children}
                        </code>
                      </pre>
                    );
                  },
                  // Style links
                  a: ({ children, ...props }) => (
                    <a
                      style={{
                        color: "#3b82f6",
                        textDecoration: "underline",
                      }}
                      target="_blank"
                      rel="noopener noreferrer"
                      {...props}
                    >
                      {children}
                    </a>
                  ),
                  // Style lists
                  ul: ({ children, ...props }) => (
                    <ul
                      style={{
                        marginTop: "8px",
                        marginBottom: "8px",
                        paddingLeft: "20px",
                      }}
                      {...props}
                    >
                      {children}
                    </ul>
                  ),
                  ol: ({ children, ...props }) => (
                    <ol
                      style={{
                        marginTop: "8px",
                        marginBottom: "8px",
                        paddingLeft: "20px",
                      }}
                      {...props}
                    >
                      {children}
                    </ol>
                  ),
                  // Style blockquotes
                  blockquote: ({ children, ...props }) => (
                    <blockquote
                      style={{
                        borderLeft: "4px solid #d1d5db",
                        paddingLeft: "16px",
                        marginTop: "8px",
                        marginBottom: "8px",
                        color: "#6b7280",
                        fontStyle: "italic",
                      }}
                      {...props}
                    >
                      {children}
                    </blockquote>
                  ),
                  // Style tables
                  table: ({ children, ...props }) => (
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        marginTop: "8px",
                        marginBottom: "8px",
                      }}
                      {...props}
                    >
                      {children}
                    </table>
                  ),
                  th: ({ children, ...props }) => (
                    <th
                      style={{
                        border: "1px solid #d1d5db",
                        padding: "8px",
                        background: "#f3f4f6",
                        fontWeight: "600",
                        textAlign: "left",
                      }}
                      {...props}
                    >
                      {children}
                    </th>
                  ),
                  td: ({ children, ...props }) => (
                    <td
                      style={{
                        border: "1px solid #d1d5db",
                        padding: "8px",
                      }}
                      {...props}
                    >
                      {children}
                    </td>
                  ),
                  // Style headings
                  h1: ({ children, ...props }) => (
                    <h1
                      style={{
                        fontSize: "18px",
                        fontWeight: "700",
                        marginTop: "12px",
                        marginBottom: "8px",
                      }}
                      {...props}
                    >
                      {children}
                    </h1>
                  ),
                  h2: ({ children, ...props }) => (
                    <h2
                      style={{
                        fontSize: "16px",
                        fontWeight: "600",
                        marginTop: "10px",
                        marginBottom: "6px",
                      }}
                      {...props}
                    >
                      {children}
                    </h2>
                  ),
                  h3: ({ children, ...props }) => (
                    <h3
                      style={{
                        fontSize: "15px",
                        fontWeight: "600",
                        marginTop: "8px",
                        marginBottom: "4px",
                      }}
                      {...props}
                    >
                      {children}
                    </h3>
                  ),
                  // Style paragraphs
                  p: ({ children, ...props }) => (
                    <p
                      style={{
                        marginTop: "4px",
                        marginBottom: "4px",
                      }}
                      {...props}
                    >
                      {children}
                    </p>
                  ),
                }}
              >
                {msg.content}
              </Markdown>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};
