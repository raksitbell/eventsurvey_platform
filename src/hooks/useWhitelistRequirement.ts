"use client";

import { useSyncExternalStore } from "react";
import { subscribeToEventSetup } from "@/core/event/local-events";
import { getWhitelistRequirement, whitelistKey } from "@/core/event/whitelist";
import type { EventDraft } from "@/types/event/setup";

/** Observe committed entries only; dialog drafts never satisfy the requirement. */
export default function useWhitelistRequirement(
  draft: EventDraft,
  userId: string,
  eventId: string,
  locale: string,
) {
  const key = whitelistKey(userId, eventId, locale);
  return useSyncExternalStore(
    (refresh) => subscribeToEventSetup([key], refresh),
    () => getWhitelistRequirement(draft, key),
    () =>
      draft.isPrivate && draft.hasRegistration ? "missing" : "not_required",
  );
}
