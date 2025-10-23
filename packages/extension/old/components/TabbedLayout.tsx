import React from "react";

export interface TabbedLayoutProps {
  activeTab: "chat" | "workflows";
  onTabChange: (tab: "chat" | "workflows") => void;
  children: React.ReactNode;
}

export function TabbedLayout({
  activeTab,
  onTabChange,
  children,
}: TabbedLayoutProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Tab Bar */}
      <div className="flex border-b border-gray-200 bg-white">
        <button
          onClick={() => onTabChange("chat")}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === "chat"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Chat
        </button>
        <button
          onClick={() => onTabChange("workflows")}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === "workflows"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Workflows
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
