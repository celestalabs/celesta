export type UIMessageRepr =
  | { type: "user" | "agent"; content: string }
  | { type: "tool"; toolName: string; input: string; output: string | null };