import { PieceName } from "./pieceName.ts";

export const clientIdByPieceName = {
  [PieceName.GOOGLE_DRIVE]: () => process.env.TOOL_GOOGLE_CLIENT_ID,
  [PieceName.GOOGLE_CONTACTS]: () => process.env.TOOL_GOOGLE_CLIENT_ID,
  [PieceName.GMAIL]: () => process.env.TOOL_GOOGLE_CLIENT_ID,
} as const satisfies Record<PieceName, () => string | undefined>;

export const clientSecretByPieceName = {
  [PieceName.GOOGLE_DRIVE]: () => process.env.TOOL_GOOGLE_CLIENT_SECRET,
  [PieceName.GOOGLE_CONTACTS]: () => process.env.TOOL_GOOGLE_CLIENT_SECRET,
  [PieceName.GMAIL]: () => process.env.TOOL_GOOGLE_CLIENT_SECRET,
} as const satisfies Record<PieceName, () => string | undefined>;
