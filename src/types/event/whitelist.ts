/** Local-only Whitelist DTO; independent of the legacy mock Whitelist schema. */
export interface WhitelistEntry {
  id: string;
  uniqueId: string;
  name: string;
  status: "available" | "joined";
}
export type WhitelistRowIssue =
  "emptyId" | "invalidEmail" | "duplicate" | "used";
export interface WhitelistImportPreview {
  fileName: string;
  idColumn: string | null;
  nameColumn: string | null;
  columnMismatch: boolean;
  entries: WhitelistEntry[];
  invalidCount: number;
}
