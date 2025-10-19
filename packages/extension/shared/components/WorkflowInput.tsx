import React, { useState } from "react";

interface WorkflowInputProps {
  onExecute: (prompt: string) => void;
}

export const WorkflowInput: React.FC<WorkflowInputProps> = ({ onExecute }) => {
  const [promptInput, setPromptInput] = useState("");

  const handleExecute = () => {
    if (promptInput.trim()) {
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
      <div style={{ display: "flex", gap: "8px" }}>
        <input
          value={promptInput}
          onChange={(e) => setPromptInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleExecute()}
          placeholder="Enter workflow prompt (e.g., 'Check my emails and summarize them')..."
          style={{
            flex: 1,
            padding: "12px",
            border: "2px solid #d1d5db",
            borderRadius: "4px",
            fontSize: "14px",
          }}
        />
        <button
          onClick={handleExecute}
          disabled={!promptInput.trim()}
          style={{
            padding: "12px 24px",
            background: "#10b981",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: promptInput.trim() ? "pointer" : "not-allowed",
            fontWeight: "bold",
            fontSize: "14px",
            opacity: promptInput.trim() ? 1 : 0.5,
          }}
        >
          Execute Workflow
        </button>
      </div>
    </div>
  );
};
