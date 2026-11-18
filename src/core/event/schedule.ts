import type { EventDraft } from "@/types/event/setup";

export function surveyClosingTime(draft: EventDraft): string | null {
  if (!draft.endsAt) return null;
  if (draft.surveyCloseMode === "custom")
    return draft.surveyCustomClose ?? null;
  const days =
    draft.surveyCloseMode === "event"
      ? 0
      : draft.surveyCloseMode === "fortnight"
        ? 14
        : 7;
  const end = Date.parse(draft.endsAt);
  return Number.isFinite(end)
    ? new Date(end + days * 86_400_000).toISOString()
    : null;
}
