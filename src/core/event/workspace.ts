import { canEditLocalEventSetup, restoreEventDraft } from "@/core/event/draft";
import { loadPublication, publicationKey } from "@/core/event/publication";
import type { EventWorkspace } from "@/types/event/workspace";

/** An unpublished local setup is Draft even when the assigned server event is already open. */
export function eventWorkspaceDisplayStatus(
  workspace: EventWorkspace,
): EventWorkspace["eventStatus"] {
  return workspace.hasLocalDraft && !workspace.localPublishedAt
    ? "draft"
    : workspace.eventStatus;
}

/** Resolve saved setup for every workspace consumer without changing server lifecycle or permissions. */
export function restoreLocalEventWorkspace(
  workspace: EventWorkspace,
  userId: string,
  locale: string,
): EventWorkspace {
  const publication = canEditLocalEventSetup(workspace)
    ? loadPublication(publicationKey(userId, workspace.eventId, locale))
    : null;
  const restored = restoreEventDraft(workspace, userId, locale);
  return publication
    ? {
        ...restored,
        ...publication.draft,
        localPublishedAt: publication.publishedAt,
      }
    : restored;
}
