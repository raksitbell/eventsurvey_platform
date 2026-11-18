import { canEditLocalEventSetup, restoreEventDraft } from "@/core/event/draft";
import { projectEventContent } from "@/core/event/content";
import { loadEventPublication } from "@/core/event/publication";
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
    ? loadEventPublication(
        userId,
        workspace.eventId,
        locale,
        !!workspace.content,
      )
    : null;
  return publication
    ? projectEventContent(
        {
          ...workspace,
          ...publication.draft,
          localPublishedAt: publication.publishedAt,
        },
        locale,
      )
    : restoreEventDraft(workspace, userId, locale);
}
