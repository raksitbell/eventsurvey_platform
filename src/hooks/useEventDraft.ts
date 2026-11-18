"use client";

import type { EventDraft, DraftSaveStatus } from "@/types/event/setup";

import { normalizeEventAccess } from "@/core/event/access";
import { projectEventContent } from "@/core/event/content";
import {
  canEditLocalEventSetup,
  eventDraftKey,
  eventDraftSchema,
  eventDraftV2Key,
  saveEventDraft,
} from "@/core/event/draft";
import { loadEventPublication } from "@/core/event/publication";
import type { EventWorkspace } from "@/types/event/workspace";
import { useState } from "react";

export default function useEventDraft(
  workspace: EventWorkspace,
  userId: string,
  locale: string,
) {
  const readOnly = !canEditLocalEventSetup(workspace);
  const [source, setSource] = useState(workspace);
  const [draft, setDraft] = useState<EventDraft>(() =>
    eventDraftSchema.parse(workspace),
  );
  const [status, setStatus] = useState<DraftSaveStatus | "idle">("idle");
  if (source !== workspace) {
    setSource(workspace);
    // Follow valid saves from another tab, while keeping locally invalid
    // input visible for correction until the workspace becomes read-only.
    if (readOnly || status === "idle" || status === "saved") {
      setDraft(eventDraftSchema.parse(workspace));
      if (readOnly) setStatus("idle");
    }
  }
  const persist = (value: EventDraft) => {
    const { eventId } = workspace;
    if (loadEventPublication(userId, eventId, locale, !!value.content)) {
      setStatus("error");
      return false;
    }
    const key = value.content
      ? eventDraftV2Key(userId, eventId)
      : eventDraftKey(userId, eventId, locale);
    const result = saveEventDraft(key, value);
    setStatus(result);
    return result === "saved";
  };
  const change = (changes: Partial<EventDraft>) => {
    if (readOnly) return;
    const updated = normalizeEventAccess({ ...draft, ...changes });
    const next = updated.content
      ? projectEventContent(updated, locale)
      : updated;
    setDraft(next);
    // Synchronous local persistence prevents losing the last keystroke on navigation.
    persist(next);
  };
  const save = () => readOnly || persist(draft);
  return { draft, status, readOnly, change, save };
}
