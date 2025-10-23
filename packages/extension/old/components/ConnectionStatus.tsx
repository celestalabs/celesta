import React from "react";

interface ConnectionStatusProps {
  connected: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  connected,
}) => {
  return (
    <div
      style={{
        padding: "10px",
        background: connected ? "#4ade80" : "#f87171",
        color: "white",
        fontWeight: "bold",
        textAlign: "center",
      }}
    >
      {connected ? "🟢 Connected to Workflow Server" : "🔴 Disconnected"}
    </div>
  );
};
