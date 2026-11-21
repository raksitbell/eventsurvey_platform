import type { PublicFormAnswer } from "@/core/event/public-form-response";

type Answers = Record<string, PublicFormAnswer>;
type Draft = { answers: Answers; storageError: boolean };
type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export const emptyAnswerDraft: Draft = { answers: {}, storageError: false };
const validScope = /^[a-f0-9]{64}$/;

function storageKey(scope: string) {
  if (!validScope.test(scope)) throw new Error("Invalid participant draft scope");
  return "eventsurvey:answers:v1:" + scope;
}

function readAnswers(raw: string | null): Answers {
  if (raw === null) return {};
  const data: unknown = JSON.parse(raw);
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid answer draft");
  const entries = Object.entries(data);
  for (const [, value] of entries) {
    if (typeof value === "string" || (typeof value === "number" && Number.isFinite(value))) continue;
    if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) throw new Error("Invalid answer");
  }
  return Object.fromEntries(entries);
}

/** One live form instance. Rechecking eligibility may temporarily hide its current scope. */
export function createAnswerDrafts(storage: () => DraftStorage = () => globalThis.sessionStorage) {
  const drafts = new Map<string, Draft>();
  const listeners = new Set<() => void>();
  function read(scope?: string): Draft {
    if (!scope) return emptyAnswerDraft;
    let draft = drafts.get(scope);
    if (!draft) {
      try {
        draft = { answers: readAnswers(storage().getItem(storageKey(scope))), storageError: false };
      } catch {
        draft = { answers: {}, storageError: true };
      }
      drafts.set(scope, draft);
    }
    return draft;
  }
  function write(scope: string, answers: Answers): boolean {
    let storageError = false;
    try {
      const key = storageKey(scope);
      if (Object.keys(answers).length) storage().setItem(key, JSON.stringify(answers));
      else storage().removeItem(key);
    } catch {
      storageError = true;
    }
    drafts.set(scope, { answers, storageError });
    for (const listener of listeners) listener();
    return !storageError;
  }
  return {
    read, write,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}
