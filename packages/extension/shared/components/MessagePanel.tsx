import React, { useRef, useEffect } from "react";

export interface DisplayMessage {
  id: string;
  type: string;
  content: string;
  sender: string;
  timestamp: Date;
}

interface MessagePanelProps {
  messages: DisplayMessage[];
}

export const MessagePanel: React.FC<MessagePanelProps> = ({ messages }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

  return (
    <div
      style={{
        flex: 1,
        overflow: "auto",
        padding: "10px",
        background: "#f9fafb",
      }}
    >
      {messages.map((msg) => (
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
            }}
          >
            <strong>{msg.sender}</strong> • {msg.type} •{" "}
            {msg.timestamp.toLocaleTimeString()}
          </div>
          <div style={{ fontSize: "14px" }}>{msg.content}</div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};
