"use client";
import { useState } from "react";
import {
  canEditWhitelist,
  loadWhitelist,
  saveWhitelist,
  whitelistKey,
} from "@/core/event/whitelist";
import type { WhitelistEntry } from "@/types/event/whitelist";
import type { EventWorkspace } from "@/types/event/workspace";

export default function useEventWhitelist(
  workspace: EventWorkspace,
  userId: string,
  locale: string,
) {
  const key = whitelistKey(userId, workspace.eventId, locale);
  const [initial] = useState(() => loadWhitelist(key));
  const [entries, setEntries] = useState(initial.entries);
  const [saved, setSaved] = useState(initial.entries);
  const [error, setError] = useState(initial.error);
  const readOnly = !canEditWhitelist(workspace) || initial.error;
  const change = (next: WhitelistEntry[]) => {
    if (!readOnly) setEntries(next);
  };
  const save = () => {
    if (readOnly) return false;
    const ok = saveWhitelist(key, entries) === "saved";
    setError(!ok);
    if (ok) setSaved(entries);
    return ok;
  };
  return {
    entries,
    change,
    save,
    readOnly,
    error,
    dirty: JSON.stringify(entries) !== JSON.stringify(saved),
  };
}
