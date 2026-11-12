"use client";

import { loadPublication, publicationKey } from "@/core/event/publication";
import { useState } from "react";
import {
  defaultEventBranding,
  eventBrandingKey,
  loadEventBranding,
  saveEventBranding,
} from "@/core/event/branding";
import { canEditLocalEventSetup } from "@/core/event/draft";
import type { EventBranding } from "@/types/event/branding";
import type { EventWorkspace } from "@/types/event/workspace";
import type { DraftSaveStatus } from "@/types/event/setup";

export default function useEventBranding(
  workspace: EventWorkspace,
  userId: string,
  locale: string,
) {
  const readOnly = !canEditLocalEventSetup(workspace);
  const key = eventBrandingKey(userId, workspace.eventId, locale);
  const [branding, setBranding] = useState<EventBranding>(
    () =>
      (workspace.localPublishedAt
        ? loadPublication(publicationKey(userId, workspace.eventId, locale))
            ?.branding
        : null) ??
      (readOnly ? { ...defaultEventBranding } : loadEventBranding(key)),
  );
  const [status, setStatus] = useState<DraftSaveStatus | "idle">("idle");
  const change = (changes: Partial<EventBranding>) => {
    if (readOnly) return false;
    const next = { ...branding, ...changes };
    const result = saveEventBranding(key, next);
    setStatus(result);
    if (result !== "saved") return false;
    setBranding(next);
    return true;
  };
  const save = () => {
    if (readOnly) return true;
    const result = saveEventBranding(key, branding);
    setStatus(result);
    return result === "saved";
  };
  return { branding, status, readOnly, change, save };
}
