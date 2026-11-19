import type { EventWorkspace } from "@/types/event/workspace";

const memory = new Map<string, EventWorkspace | null>();

function cacheKey(userId: string, locale: string) {
  return `${userId}:${locale}`;
}

function storageKey(userId: string, locale: string) {
  return `eventsurvey:workspace-cache:v1:${userId}:${locale}`;
}

/** `undefined` = miss; `null` = cached empty workspace. */
export function readWorkspaceCache(
  userId: string,
  locale: string,
): EventWorkspace | null | undefined {
  const key = cacheKey(userId, locale);
  if (memory.has(key)) return memory.get(key);

  try {
    const raw = globalThis.sessionStorage?.getItem(storageKey(userId, locale));
    if (raw == null) return undefined;
    const parsed = JSON.parse(raw) as EventWorkspace | null;
    memory.set(key, parsed);
    return parsed;
  } catch {
    return undefined;
  }
}

export function writeWorkspaceCache(
  userId: string,
  locale: string,
  workspace: EventWorkspace | null,
) {
  const key = cacheKey(userId, locale);
  memory.set(key, workspace);
  try {
    globalThis.sessionStorage?.setItem(
      storageKey(userId, locale),
      JSON.stringify(workspace),
    );
  } catch {
    // Ignore quota / private-mode write failures; memory cache still applies.
  }
}
