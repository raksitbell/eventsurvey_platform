"use client";

import { loadEventPublication } from "@/core/event/publication";
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
  const { eventId } = workspace;
  const key = eventBrandingKey(userId, eventId, locale);
  const [editedBranding, setBranding] = useState<EventBranding>(() =>
    readOnly ? { ...defaultEventBranding } : loadEventBranding(key),
  );
  const [status, setStatus] = useState<DraftSaveStatus | "idle">("idle");
  const readReceipt = () =>
    loadEventPublication(userId, eventId, locale, !!workspace.content);
  const branding = readOnly
    ? ((workspace.localPublishedAt ? readReceipt()?.branding : null) ??
      defaultEventBranding)
    : editedBranding;
  const change = (changes: Partial<EventBranding>) => {
    if (readOnly || readReceipt()) return false;
    const next = { ...branding, ...changes };
    const result = saveEventBranding(key, next);
    setStatus(result);
    if (result !== "saved") return false;
    setBranding(next);
    return true;
  };
  const save = () => {
    if (readOnly) return true;
    if (readReceipt()) {
      setStatus("error");
      return false;
    }
    const result = saveEventBranding(key, branding);
    setStatus(result);
    return result === "saved";
  };
  return { branding, status, readOnly, change, save };
}
