import { ToolSet } from "ai";

export type ToolMetadata = [name: string, description: string];

export function getMetadataFromToolSet(tools: ToolSet): ToolMetadata[] {
  return Object.entries(tools).map(([name, tool]) => [
    name,
    tool.description ?? "No description available.",
  ]);
}

export function formatToolMetadataForPrompt(
  toolMetadata: ToolMetadata[]
): string {
  if (toolMetadata.length === 0) {
    return "No tools are currently available.";
  }

  const formattedTools = toolMetadata
    .map(([name, description]) => `- ${name}: ${description}`)
    .join("\n");

  return `Available Tools:\n${formattedTools}`;
}
