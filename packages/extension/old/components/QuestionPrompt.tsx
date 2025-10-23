import React, { useState } from "react";

interface QuestionPromptProps {
  question: {
    id: string;
    content: string;
  };
  onSubmit: (id: string, answer: string) => void;
}

export const QuestionPrompt: React.FC<QuestionPromptProps> = ({
  question,
  onSubmit,
}) => {
  const [answerInput, setAnswerInput] = useState("");

  const handleSubmit = () => {
    if (answerInput.trim()) {
      onSubmit(question.id, answerInput);
      setAnswerInput("");
    }
  };

  return (
    <div
      style={{
        padding: "10px",
        background: "#fef3c7",
        borderTop: "2px solid #fbbf24",
      }}
    >
      <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
        ❓ Question from Agent:
      </div>
      <div style={{ marginBottom: "8px" }}>{question.content}</div>
      <div style={{ display: "flex", gap: "8px" }}>
        <input
          value={answerInput}
          onChange={(e) => setAnswerInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Type your answer..."
          style={{
            flex: 1,
            padding: "8px",
            border: "1px solid #d1d5db",
            borderRadius: "4px",
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={!answerInput.trim()}
          style={{
            padding: "8px 16px",
            background: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: answerInput.trim() ? "pointer" : "not-allowed",
            opacity: answerInput.trim() ? 1 : 0.5,
          }}
        >
          Submit Answer
        </button>
      </div>
    </div>
  );
};
