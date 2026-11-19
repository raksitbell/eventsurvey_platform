import { normalizeContentLocale } from "@/core/event/content";
import type { EventDraft } from "@/types/event/setup";
import type {
  ParticipantFormKind,
  ParticipantPreviewOrigin,
} from "@/types/event/participant";

export function participantPreviewHref(
  origin: ParticipantPreviewOrigin,
  locale?: string | null,
): string {
  const search = new URLSearchParams();
  if (origin === "publish") search.set("from", origin);
  const contentLocale = normalizeContentLocale(locale);
  if (contentLocale) search.set("lang", contentLocale);
  const query = search.toString();
  return query ? `/preview/event?${query}` : "/preview/event";
}

export function participantPreviewReturnHref(
  origin: ParticipantPreviewOrigin,
  locale?: string | null,
): string {
  const path = origin === "publish" ? "/event/publish" : "/event/branding";
  const contentLocale = normalizeContentLocale(locale);
  return contentLocale ? `${path}?lang=${contentLocale}` : path;
}

export function participantFormActions(
  draft: EventDraft,
): ParticipantFormKind[] {
  return (["registration", "survey"] as const).filter((kind) =>
    kind === "registration" ? draft.hasRegistration : draft.hasSurvey,
  );
}
