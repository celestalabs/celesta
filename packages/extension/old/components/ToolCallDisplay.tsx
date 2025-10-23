import React, { useState } from "react";

interface ToolCallDisplayProps {
  toolCallId: string;
  toolName: string;
  toolArgs?: any;
  toolResult?: any;
  timestamp: Date;
}

export const ToolCallDisplay: React.FC<ToolCallDisplayProps> = ({
  toolCallId,
  toolName,
  toolArgs,
  toolResult,
  timestamp,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasResult = toolResult !== undefined;

  return (
    <details
      open={isExpanded}
      onToggle={(e) => setIsExpanded(e.currentTarget.open)}
      style={{
        marginBottom: "8px",
        background: hasResult ? "#f0fdf4" : "#fef3c7",
        border: `1px solid ${hasResult ? "#86efac" : "#fbbf24"}`,
        borderRadius: "6px",
        padding: "8px",
      }}
    >
      <summary
        style={{
          cursor: "pointer",
          fontWeight: "600",
          fontSize: "13px",
          color: hasResult ? "#166534" : "#92400e",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          userSelect: "none",
        }}
      >
        <span>{hasResult ? "✅" : "⏳"}</span>
        <span>
          {toolName}
          {hasResult ? " (completed)" : " (pending)"}
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: "11px",
            color: "#6b7280",
            fontWeight: "400",
          }}
        >
          {timestamp.toLocaleTimeString()}
        </span>
      </summary>

      <div style={{ marginTop: "12px" }}>
        {/* Tool Arguments */}
        <div style={{ marginBottom: "12px" }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: "600",
              color: "#4b5563",
              marginBottom: "4px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Arguments
          </div>
          <pre
            style={{
              background: "#1f2937",
              color: "#f9fafb",
              padding: "8px",
              borderRadius: "4px",
              overflow: "auto",
              fontSize: "12px",
              margin: 0,
              fontFamily: "monospace",
            }}
          >
            <code>{JSON.stringify(toolArgs, null, 2)}</code>
          </pre>
        </div>

        {/* Tool Result */}
        {hasResult && (
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: "600",
                color: "#4b5563",
                marginBottom: "4px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Result
            </div>
            <pre
              style={{
                background: "#1f2937",
                color: "#f9fafb",
                padding: "8px",
                borderRadius: "4px",
                overflow: "auto",
                fontSize: "12px",
                margin: 0,
                fontFamily: "monospace",
                maxHeight: "300px",
              }}
            >
              <code>{JSON.stringify(toolResult, null, 2)}</code>
            </pre>
          </div>
        )}
      </div>
    </details>
  );
};
