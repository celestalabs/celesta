import React, { useState } from "react";

interface WorkflowInputProps {
  onExecute: (prompt: string) => void;
  disabled?: boolean;
}

export const WorkflowInput: React.FC<WorkflowInputProps> = ({
  onExecute,
  disabled = false,
}) => {
  const [promptInput, setPromptInput] = useState("");

  const handleExecute = () => {
    if (promptInput.trim() && !disabled) {
      onExecute(promptInput);
      setPromptInput("");
    }
  };

  return (
    <div
      style={{
        padding: "10px",
        borderTop: "1px solid #e5e7eb",
        background: "white",
      }}
    >
      {disabled && (
        <div
          style={{
            fontSize: "12px",
            color: "#6b7280",
            marginBottom: "8px",
            fontStyle: "italic",
          }}
        >
          ⏳ Agent is working...
        </div>
      )}
      <div style={{ display: "flex", gap: "8px" }}>
        <input
          value={promptInput}
          onChange={(e) => setPromptInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleExecute()}
          placeholder="Enter workflow prompt (e.g., 'Check my emails and summarize them')..."
          disabled={disabled}
          style={{
            flex: 1,
            padding: "12px",
            border: "2px solid #d1d5db",
            borderRadius: "4px",
            fontSize: "14px",
            opacity: disabled ? 0.6 : 1,
            cursor: disabled ? "not-allowed" : "text",
          }}
        />
        <button
          onClick={handleExecute}
          disabled={!promptInput.trim() || disabled}
          style={{
            padding: "12px 24px",
            background: "#10b981",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: promptInput.trim() && !disabled ? "pointer" : "not-allowed",
            fontWeight: "bold",
            fontSize: "14px",
            opacity: promptInput.trim() && !disabled ? 1 : 0.5,
          }}
        >
          Execute Workflow
        </button>
      </div>
    </div>
  );
};
