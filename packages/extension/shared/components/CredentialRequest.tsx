import React from "react";

interface CredentialRequestProps {
  request: {
    id: string;
    integrationName: string;
  };
  onApprove: (id: string, integrationName: string) => void;
  onReject: (id: string, integrationName: string) => void;
}

export const CredentialRequest: React.FC<CredentialRequestProps> = ({
  request,
  onApprove,
  onReject,
}) => {
  const formatIntegrationName = (name: string) => {
    // Convert names like "gmail" to "Gmail", "google-calendar" to "Google Calendar"
    return name
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div
      style={{
        padding: "16px",
        background: "#eff6ff",
        borderTop: "3px solid #3b82f6",
        borderBottom: "1px solid #93c5fd",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "12px",
        }}
      >
        <div
          style={{
            fontSize: "24px",
          }}
        >
          🔐
        </div>
        <div>
          <div
            style={{ fontWeight: "bold", fontSize: "15px", color: "#1e40af" }}
          >
            Authorization Required
          </div>
          <div style={{ fontSize: "13px", color: "#3b82f6", marginTop: "2px" }}>
            {formatIntegrationName(request.integrationName)}
          </div>
        </div>
      </div>

      <div
        style={{
          fontSize: "14px",
          color: "#1e3a8a",
          marginBottom: "12px",
          lineHeight: "1.5",
        }}
      >
        We need your authorization to access your{" "}
        {formatIntegrationName(request.integrationName)} account to complete
        this task.
      </div>

      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={() => onApprove(request.id, request.integrationName)}
          style={{
            flex: 1,
            padding: "10px 16px",
            background: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "14px",
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#2563eb";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#3b82f6";
          }}
        >
          🔓 Authorize Access
        </button>
        <button
          onClick={() => onReject(request.id, request.integrationName)}
          style={{
            padding: "10px 16px",
            background: "white",
            color: "#6b7280",
            border: "2px solid #d1d5db",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "500",
            fontSize: "14px",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#f3f4f6";
            e.currentTarget.style.borderColor = "#9ca3af";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "white";
            e.currentTarget.style.borderColor = "#d1d5db";
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
