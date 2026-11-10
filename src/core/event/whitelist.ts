import { z } from "zod";
import type {
  WhitelistEntry,
  WhitelistImportPreview,
  WhitelistRowIssue,
} from "@/types/event/whitelist";
import type { EventWorkspace } from "@/types/event/workspace";

// Email is the supplied Figma prototype's Unique ID kind. The current BFF does
// not expose the Registration Unique Field; this local list cannot attest to it.
const email = z.email().max(500);
export function normalizeWhitelistId(value: string): string {
  return value.trim().toLowerCase();
}
const entrySchema = z.object({
  id: z.string().min(1),
  uniqueId: z.string().transform(normalizeWhitelistId).pipe(email),
  name: z.string().trim().max(500),
  status: z.enum(["available", "joined"]),
});
export const whitelistSchema = z
  .array(entrySchema)
  .refine(
    (entries) =>
      new Set(entries.map((e) => e.uniqueId)).size === entries.length &&
      new Set(entries.map((e) => e.id)).size === entries.length,
  );
export function whitelistKey(userId: string, eventId: string, locale: string) {
  return `eventsurvey:event-whitelist:v1:${userId}:${eventId}:${locale}`;
}
export function canEditWhitelist(workspace: EventWorkspace): boolean {
  return (
    !!workspace.canManageWhitelist &&
    !workspace.localPublishedAt &&
    (workspace.eventStatus === "draft" ||
      workspace.userRole === "event_owner") &&
    workspace.isPrivate &&
    workspace.hasRegistration
  );
}
export function loadWhitelist(key: string): {
  entries: WhitelistEntry[];
  error: boolean;
} {
  try {
    const raw = globalThis.localStorage.getItem(key);
    if (!raw) return { entries: [], error: false };
    const parsed = whitelistSchema.safeParse(JSON.parse(raw));
    return parsed.success
      ? { entries: parsed.data, error: false }
      : { entries: [], error: true };
  } catch {
    return { entries: [], error: true };
  }
}
export function saveWhitelist(
  key: string,
  entries: WhitelistEntry[],
): "saved" | "invalid" | "error" {
  const parsed = whitelistSchema.safeParse(entries);
  if (!parsed.success) return "invalid";
  try {
    globalThis.localStorage.setItem(key, JSON.stringify(parsed.data));
    return "saved";
  } catch {
    return "error";
  }
}
export function whitelistEntryIssue(
  value: string,
  existing: WhitelistEntry[],
): WhitelistRowIssue | null {
  const id = normalizeWhitelistId(value);
  if (!id) return "emptyId";
  if (!email.safeParse(id).success) return "invalidEmail";
  const match = existing.find((e) => e.uniqueId === id);
  return match ? (match.status === "joined" ? "used" : "duplicate") : null;
}
/** RFC 4180-style CSV: BOM, CRLF, quoted commas/newlines and escaped quotes. */
export function parseWhitelistCsv(source: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    value = "",
    quoted = false,
    closed = false;
  const text = source.replace(/^\uFEFF/, "");
  const cell = () => {
    row.push(value);
    value = "";
    closed = false;
  };
  const line = () => {
    cell();
    if (row.some((v) => v.trim())) rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          value += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else value += c;
    } else if (c === '"' && !value && !closed) quoted = true;
    else if (c === ",") cell();
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      line();
    } else if (closed && c.trim()) throw new Error("Invalid CSV quote");
    else if (c === '"') throw new Error("Invalid CSV quote");
    else if (!closed) value += c;
  }
  if (quoted) throw new Error("Unclosed CSV quote");
  if (value || row.length || closed) line();
  return rows;
}
export function previewWhitelistImport(
  rows: unknown[][],
  fileName: string,
  existing: WhitelistEntry[],
): WhitelistImportPreview {
  const headers = (rows[0] ?? []).map((v) => String(v ?? "").trim());
  const normalized = headers.map((v) => v.toLowerCase().replace(/\s/g, ""));
  const idIndex = normalized.indexOf("uniqueid"),
    nameIndex = normalized.indexOf("name");
  const columnMismatch =
    idIndex < 0 || new Set(normalized).size !== normalized.length;
  const entries: WhitelistEntry[] = [];
  let invalidCount = 0;
  const seen = new Set(
    existing.filter((e) => e.status === "joined").map((e) => e.uniqueId),
  );
  if (!columnMismatch)
    for (const row of rows.slice(1)) {
      if (
        row.every(
          (v) => v === null || v === undefined || String(v).trim() === "",
        )
      )
        continue;
      const uniqueId = normalizeWhitelistId(String(row[idIndex] ?? ""));
      const name = nameIndex < 0 ? "" : String(row[nameIndex] ?? "").trim();
      if (
        whitelistEntryIssue(uniqueId, []) ||
        seen.has(uniqueId) ||
        name.length > 500 ||
        row.length > headers.length
      ) {
        invalidCount++;
        continue;
      }
      seen.add(uniqueId);
      entries.push({
        id: crypto.randomUUID(),
        uniqueId,
        name,
        status: "available",
      });
    }
  return {
    fileName,
    idColumn: idIndex < 0 ? null : headers[idIndex],
    nameColumn: nameIndex < 0 ? null : headers[nameIndex],
    columnMismatch,
    entries,
    invalidCount,
  };
}
/** Retain used records for references; never grant another right for the same ID. */
export function replaceWhitelist(
  current: WhitelistEntry[],
  incoming: WhitelistEntry[],
): WhitelistEntry[] {
  const used = current.filter((e) => e.status === "joined");
  const usedIds = new Set(used.map((e) => e.uniqueId));
  return [
    ...used,
    ...incoming.filter(
      (e) => !usedIds.has(e.uniqueId) && e.status === "available",
    ),
  ];
}
