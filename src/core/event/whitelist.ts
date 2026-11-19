import { z } from "zod";
import { supportsUniqueField } from "@/core/forms/unique-field";
import type {
  WhitelistEntry,
  WhitelistImportPreview,
  WhitelistRowIssue,
  WhitelistUniqueField,
  WhitelistUniqueKind,
} from "@/types/event/whitelist";
import type { FormRecord } from "@/types/event/form";
import type { EventWorkspace } from "@/types/event/workspace";

const email = z.email().max(500);
const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const legacyField = { id: "legacy", type: "email" } as const;

export function whitelistUniqueField(
  form: FormRecord,
): WhitelistUniqueField | null {
  if (form.type !== "registration") return null;
  const fields = form.questions.filter(({ question }) => question.is_unique);
  if (fields.length !== 1) return null;
  const { question } = fields[0];
  if (!question.id || !supportsUniqueField(question.type)) return null;
  const field: WhitelistUniqueField = { id: question.id, type: question.type };
  if (question.type === "short_text") {
    field.minLength = question.min_length;
    field.maxLength = question.max_length || 255;
  } else if (question.type === "number") {
    field.min = question.min_value ?? undefined;
    field.max = question.max_value ?? undefined;
  }
  return field;
}

export function normalizeWhitelistId(
  value: string,
  kind: WhitelistUniqueKind = "email",
): string {
  const trimmed = value.trim();
  if (kind === "email") return trimmed.toLowerCase();
  if (kind !== "number" || !decimal.test(trimmed)) return trimmed;
  const number = Number(trimmed);
  return Number.isFinite(number) ? String(number) : trimmed;
}

const entrySchema = z.object({
  id: z.string().min(1).max(255),
  uniqueId: z.string().min(1).max(500),
  name: z.string().trim().max(500),
  status: z.enum(["available", "joined"]),
});
export const whitelistEntriesSchema = z.array(entrySchema).max(5000);
const legacyWhitelistSchema = whitelistEntriesSchema.transform(
  (entries, context) => {
    const parsed = parseWhitelistEntries(entries, legacyField);
    if (parsed) return parsed;
    context.addIssue({ code: "custom", message: "Invalid legacy Whitelist" });
    return z.NEVER;
  },
);

export function parseWhitelistEntries(
  value: unknown,
  field: WhitelistUniqueField,
): WhitelistEntry[] | null {
  const parsed = whitelistEntriesSchema.safeParse(value);
  if (!parsed.success) return null;
  const result: WhitelistEntry[] = [];
  const seenIds = new Set<string>();
  const seenValues = new Set<string>();
  for (const entry of parsed.data) {
    if (seenIds.has(entry.id) || whitelistEntryIssue(entry.uniqueId, [], field))
      return null;
    const uniqueId = normalizeWhitelistId(entry.uniqueId, field.type);
    if (seenValues.has(uniqueId)) return null;
    seenIds.add(entry.id);
    seenValues.add(uniqueId);
    result.push({ ...entry, uniqueId });
  }
  return result;
}
export function whitelistKey(userId: string, eventId: string, locale: string) {
  return `eventsurvey:event-whitelist:v1:${userId}:${eventId}:${locale}`;
}
export function canEditWhitelist(workspace: EventWorkspace): boolean {
  return (
    !!workspace.canManageWhitelist &&
    !workspace.setup?.publication &&
    !workspace.localPublishedAt &&
    workspace.eventStatus === "draft" &&
    (workspace.whitelistEnabledForSetup ?? (workspace.isPrivate && workspace.hasRegistration))
  );
}
export function whitelistRegistrationBuilderHref(workspace: EventWorkspace) {
  if (!canEditWhitelist(workspace)) return undefined;
  return workspace.canEditEvent && workspace.hasRegistration
    ? "/event/setup/registration"
    : "/event/form/registration";
}
interface LegacyWhitelist {
  key: string;
  raw: string;
  entries: WhitelistEntry[];
}

export function readLegacyWhitelists(
  userId: string,
  eventId: string,
): LegacyWhitelist[] {
  const result: LegacyWhitelist[] = [];
  for (const locale of ["th", "en"]) {
    const key = whitelistKey(userId, eventId, locale);
    try {
      const raw = globalThis.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = legacyWhitelistSchema.safeParse(JSON.parse(raw));
      if (parsed.success && parsed.data.length)
        result.push({ key, raw, entries: parsed.data });
    } catch {
      // Existing data remains available when the browser or stored file can be repaired.
    }
  }
  return result;
}

function matchingRecoveredEntry(
  entry: WhitelistEntry,
  candidate: WhitelistEntry,
): boolean {
  return (
    candidate.name === entry.name &&
    (entry.status === "available" || candidate.status === "joined")
  );
}

export function mergeLegacyWhitelist(
  active: WhitelistEntry[],
  legacy: readonly LegacyWhitelist[],
  field: WhitelistUniqueField,
): { entries: WhitelistEntry[]; matches: number; unresolved: number } {
  const merged = new Map(active.map((entry) => [entry.uniqueId, entry]));
  const ids = new Set(active.map((entry) => entry.id));
  let matches = 0;
  let unresolved = 0;
  for (const { entries } of legacy) {
    for (const entry of entries) {
      if (whitelistEntryIssue(entry.uniqueId, [], field)) {
        unresolved++;
        continue;
      }
      const uniqueId = normalizeWhitelistId(entry.uniqueId, field.type);
      const existing = merged.get(uniqueId);
      if (existing) {
        if (matchingRecoveredEntry(entry, existing)) matches++;
        else unresolved++;
        continue;
      }
      if (entry.status === "joined" || ids.has(entry.id)) {
        unresolved++;
        continue;
      }
      merged.set(uniqueId, { ...entry, uniqueId });
      ids.add(entry.id);
      matches++;
    }
  }
  return { entries: [...merged.values()], matches, unresolved };
}

export function removeVerifiedLegacyWhitelists(
  active: WhitelistEntry[],
  legacy: readonly LegacyWhitelist[],
  field: WhitelistUniqueField,
): void {
  const byValue = new Map(active.map((entry) => [entry.uniqueId, entry]));
  for (const { entries, key, raw } of legacy) {
    const verified = entries.every((entry) => {
      if (whitelistEntryIssue(entry.uniqueId, [], field)) return false;
      const candidate = byValue.get(
        normalizeWhitelistId(entry.uniqueId, field.type),
      );
      return !!candidate && matchingRecoveredEntry(entry, candidate);
    });
    if (!verified) continue;
    try {
      if (globalThis.localStorage.getItem(key) === raw) {
        globalThis.localStorage.removeItem(key);
      }
    } catch {
      // Keep the legacy source if the browser does not allow deletion.
    }
  }
}

export function whitelistEntryIssue(
  value: string,
  existing: WhitelistEntry[],
  field: WhitelistUniqueField = legacyField,
): WhitelistRowIssue | null {
  const id = normalizeWhitelistId(value, field.type);
  if (!id) return "emptyId";
  if (field.type === "email" && !email.safeParse(id).success)
    return "invalidEmail";
  if (
    field.type === "short_text" &&
    (id.length < (field.minLength ?? 0) ||
      id.length > Math.min(field.maxLength ?? 255, 500))
  )
    return "invalidText";
  if (field.type === "number") {
    const number = Number(id);
    if (
      !decimal.test(id) ||
      !Number.isFinite(number) ||
      (field.min != null && number < field.min) ||
      (field.max != null && number > field.max)
    )
      return "invalidNumber";
  }
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
  field: WhitelistUniqueField = legacyField,
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
      const uniqueId = normalizeWhitelistId(
        String(row[idIndex] ?? ""),
        field.type,
      );
      const name = nameIndex < 0 ? "" : String(row[nameIndex] ?? "").trim();
      if (
        whitelistEntryIssue(String(row[idIndex] ?? ""), [], field) ||
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
  const usedIds = new Set(used.map((e) => e.id));
  const usedValues = new Set(used.map((e) => e.uniqueId));
  return [
    ...used,
    ...incoming.filter(
      (e) =>
        !usedIds.has(e.id) &&
        !usedValues.has(e.uniqueId) &&
        e.status === "available",
    ),
  ];
}
