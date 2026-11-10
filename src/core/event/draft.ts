import { z } from "zod";
import { normalizeEventAccess } from "@/core/event/access";
import { notifyEventSetupSaved } from "@/core/event/local-events";
import type { EventDraft, DraftSaveStatus } from "@/types/event/setup";
import type { EventWorkspace } from "@/types/event/workspace";

export const eventDraftSchema = z
  .object({
    eventName: z.string().max(255),
    description: z.string().max(5000).nullable(),
    locationName: z.string().max(500).nullable(),
    startsAt: z.string().datetime({ offset: true }).nullable(),
    endsAt: z.string().datetime({ offset: true }).nullable(),
    isPrivate: z.boolean(),
    hasRegistration: z.boolean(),
    hasSurvey: z.boolean(),
    registrationCapacity: z.number().int().positive().nullable().optional(),
    surveyCapacity: z.number().int().positive().nullable().optional(),
    surveyAccess: z.enum(["public", "registered_only"]).nullable(),
  })
  .transform(normalizeEventAccess);

export function eventDraftKey(userId: string, eventId: string, locale: string) {
  return `eventsurvey:event-draft:v1:${userId}:${eventId}:${locale}`;
}

/** Frontend demo edits remain local, including owner previews of published events. */
export function canEditLocalEventSetup(workspace: EventWorkspace): boolean {
  if (workspace.localPublishedAt) return false;
  return workspace.eventStatus === "draft"
    ? workspace.canEditEvent
    : workspace.userRole === "event_owner";
}

export function restoreEventDraft(
  workspace: EventWorkspace,
  userId: string,
  locale: string,
): EventWorkspace {
  if (!canEditLocalEventSetup(workspace)) return workspace;
  try {
    const raw = globalThis.localStorage.getItem(
      eventDraftKey(userId, workspace.eventId, locale),
    );
    if (!raw) return workspace;
    const parsed = eventDraftSchema.safeParse(JSON.parse(raw));
    return parsed.success
      ? { ...workspace, ...parsed.data, hasLocalDraft: true }
      : workspace;
  } catch {
    return workspace;
  }
}

/** Store only valid draft fields; keep an earlier valid save when validation fails. */
export function saveEventDraft(
  key: string,
  draft: EventDraft,
): DraftSaveStatus {
  const parsed = eventDraftSchema.safeParse(draft);
  if (
    !parsed.success ||
    (parsed.data.startsAt &&
      parsed.data.endsAt &&
      Date.parse(parsed.data.endsAt) <= Date.parse(parsed.data.startsAt))
  )
    return "invalid";
  try {
    globalThis.localStorage.setItem(key, JSON.stringify(parsed.data));
    notifyEventSetupSaved(key);
    return "saved";
  } catch {
    return "error";
  }
}
