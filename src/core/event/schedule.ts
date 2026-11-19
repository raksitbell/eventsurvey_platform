import type { EventDraft } from "@/types/event/setup";

export function scheduleMinuteFloor(now = Date.now()): number {
  return Math.floor(now / 60_000) * 60_000;
}

export function isPastScheduleMinute(value: string | null | undefined, now = Date.now()): boolean {
  return !!value && Date.parse(value) < scheduleMinuteFloor(now);
}

export function surveyClosingTime(draft: EventDraft): string | null {
  if (!draft.endsAt) return null;
  if (draft.surveyCloseMode === "custom")
    return draft.surveyCustomClose ?? null;
  const days = { event: 0, week: 7, fortnight: 14 }[draft.surveyCloseMode ?? "event"];
  const end = Date.parse(draft.endsAt);
  return Number.isFinite(end)
    ? new Date(end + days * 86_400_000).toISOString()
    : null;
}

export function invalidCustomSurveyClose(draft: EventDraft): boolean {
  if (!draft.hasSurvey || draft.surveyCloseMode !== "custom") return false;
  const close = Date.parse(draft.surveyCustomClose ?? "");
  return !Number.isFinite(close) || (!!draft.endsAt && close < Date.parse(draft.endsAt));
}
