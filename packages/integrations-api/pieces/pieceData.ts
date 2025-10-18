import { googleDrive as piece__googleDrive } from "@activepieces/piece-google-drive";
import { googleContacts as piece__googleContacts } from "@activepieces/piece-google-contacts";

import {
  type PieceAuthProperty,
  type ActionRunner,
  OAuth2Property,
  InputPropertyMap,
} from "@activepieces/pieces-framework";
import { PieceName } from "./pieceName.ts";

export type ActionCompat = {
  description: string;
  displayName: string;
  name: string;
  props: InputPropertyMap;
  run: ActionRunner<any, any>;
};

export type PieceCompat = {
  displayName: string;
  logoUrl: string;
  authors: string[];
  auth?: PieceAuthProperty | undefined;
  description: string;
  getAction(actionName: string): ActionCompat | undefined;
  actions(): Record<string, ActionCompat>;
};

export const pieceByName = {
  [PieceName.GOOGLE_DRIVE]: piece__googleDrive as PieceCompat,
  [PieceName.GOOGLE_CONTACTS]: piece__googleContacts as PieceCompat,
} as const satisfies Record<PieceName, PieceCompat>;

export const pieceAuthByName = {
  [PieceName.GOOGLE_DRIVE]: piece__googleDrive.auth as OAuth2Property<any>,
  [PieceName.GOOGLE_CONTACTS]:
    piece__googleContacts.auth as OAuth2Property<any>,
} as const satisfies Record<PieceName, OAuth2Property<any>>;
