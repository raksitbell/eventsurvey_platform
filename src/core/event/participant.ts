import { normalizeContentLocale } from "@/core/event/content";
import type { EventDraft } from "@/types/event/setup";
import type {
  ParticipantDevice,
  ParticipantFormKind,
  ParticipantPreviewOrigin,
} from "@/types/event/participant";

export const PARTICIPANT_VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
} as const;

export function participantPreviewHref(
  device: ParticipantDevice,
  origin: ParticipantPreviewOrigin,
  locale?: string | null,
): string {
  const search = new URLSearchParams({ device });
  if (origin === "publish") search.set("from", origin);
  const contentLocale = normalizeContentLocale(locale);
  if (contentLocale) search.set("lang", contentLocale);
  return `/preview/event?${search}`;
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
