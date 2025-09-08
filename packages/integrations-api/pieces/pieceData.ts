import { googleDrive as piece__googleDrive } from "@activepieces/piece-google-drive";
import { type Piece } from "@activepieces/pieces-framework";
import { PieceName } from "./pieceName.ts";

export const pieceByName = {
  [PieceName.GOOGLE_DRIVE]: piece__googleDrive,
} as const satisfies Record<PieceName, Piece>;

export const pieceAuthByName = {
  [PieceName.GOOGLE_DRIVE]: piece__googleDrive.auth,
} as const satisfies Record<PieceName, Piece["auth"]>;
