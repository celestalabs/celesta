import { PieceName } from "./pieceName.ts";

// Helper functions to get client ID and secret
export function getClientIdByPieceName(name: PieceName): string | undefined {
  return clientIdByPieceName[name];
}

export function getClientSecretByPieceName(name: PieceName): string | undefined {
  return clientSecretByPieceName[name];
}

export const clientIdByPieceName = {
  [PieceName.GOOGLE_DRIVE]: process.env.TOOL_GOOGLE_CLIENT_ID,
  [PieceName.GOOGLE_CONTACTS]: process.env.TOOL_GOOGLE_CONTACTS_CLIENT_ID,
} as const satisfies Partial<Record<PieceName, string | undefined>>;

export const clientSecretByPieceName = {
  [PieceName.GOOGLE_DRIVE]: process.env.TOOL_GOOGLE_CLIENT_SECRET,
  [PieceName.GOOGLE_CONTACTS]: process.env.TOOL_GOOGLE_CONTACTS_CLIENT_SECRET,
} as const satisfies Partial<Record<PieceName, string | undefined>>;
