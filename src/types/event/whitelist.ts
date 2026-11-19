/** Whitelist entry scoped to the event’s registration form. */
export interface WhitelistEntry {
  id: string;
  uniqueId: string;
  name: string;
  status: "available" | "joined";
}
export type WhitelistUniqueKind = "email" | "short_text" | "number";

export interface WhitelistUniqueField {
  id: string;
  type: WhitelistUniqueKind;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
}

export interface WhitelistResponse {
  revision: number;
  entries: WhitelistEntry[];
  uniqueField: WhitelistUniqueField | null;
}

export type WhitelistRowIssue =
  | "emptyId"
  | "invalidEmail"
  | "invalidText"
  | "invalidNumber"
  | "duplicate"
  | "used";
export interface WhitelistImportPreview {
  fileName: string;
  idColumn: string | null;
  nameColumn: string | null;
  columnMismatch: boolean;
  entries: WhitelistEntry[];
  invalidCount: number;
}
