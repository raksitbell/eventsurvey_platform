"use client";

import type { EventDraft, DraftSaveStatus } from "@/types/event/setup";

import { normalizeEventAccess } from "@/core/event/access";
import {
  canEditLocalEventSetup,
  eventDraftKey,
  eventDraftSchema,
  saveEventDraft,
} from "@/core/event/draft";
import type { EventWorkspace } from "@/types/event/workspace";
import { useState } from "react";

export default function useEventDraft(
  workspace: EventWorkspace,
  userId: string,
  locale: string,
) {
  const readOnly = !canEditLocalEventSetup(workspace);
  const key = eventDraftKey(userId, workspace.eventId, locale);
  const [draft, setDraft] = useState<EventDraft>(() =>
    eventDraftSchema.parse(workspace),
  );
  const [status, setStatus] = useState<DraftSaveStatus | "idle">("idle");
  const persist = (value: EventDraft) => {
    const result = saveEventDraft(key, value);
    setStatus(result);
    return result === "saved";
  };
  const change = (changes: Partial<EventDraft>) => {
    if (readOnly) return;
    const next = normalizeEventAccess({ ...draft, ...changes });
    setDraft(next);
    // Synchronous local persistence prevents losing the last keystroke on navigation.
    persist(next);
  };
  const save = () => readOnly || persist(draft);
  return { draft, status, readOnly, change, save };
}
