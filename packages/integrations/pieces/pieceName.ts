export enum PieceName {
  GOOGLE_DRIVE = "google_drive",
  GOOGLE_CONTACTS = "google_contacts",
}

// type guard for piecename
export function isPieceName(value: any): value is PieceName {
  return Object.entries(PieceName).findIndex(([_, v]) => v === value) !== -1;
}
