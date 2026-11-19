import { normalizeContentLocale } from "@/core/event/content";
import type { EventDraft } from "@/types/event/setup";
import type {
  ParticipantFormKind,
  ParticipantPreviewOrigin,
  ParticipantPreviewSelection,
} from "@/types/event/participant";

type QueryValue = string | string[] | null | undefined;

function singleValue(value: QueryValue) {
  return Array.isArray(value) ? (value.length === 1 ? value[0] : null) : value;
}

export function participantPreviewSelection(
  tab: QueryValue,
  form: QueryValue,
): ParticipantPreviewSelection {
  const kind = singleValue(form);
  return {
    tab: singleValue(tab) === "form" ? "form" : "display",
    formKind: kind === "registration" || kind === "survey" ? kind : null,
  };
}

function previewPath(
  path: string,
  locale?: string | null,
  selection?: ParticipantPreviewSelection,
  fromPublish = false,
) {
  const search = new URLSearchParams();
  if (fromPublish) search.set("from", "publish");
  const contentLocale = normalizeContentLocale(locale);
  if (contentLocale) search.set("lang", contentLocale);
  if (selection?.tab === "form") search.set("tab", "form");
  if (selection?.formKind) search.set("form", selection.formKind);
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

export function participantPreviewHref(
  origin: ParticipantPreviewOrigin,
  locale?: string | null,
  selection?: ParticipantPreviewSelection,
): string {
  return previewPath("/preview/event", locale, selection, origin === "publish");
}

export function participantPreviewReturnHref(
  origin: ParticipantPreviewOrigin,
  locale?: string | null,
  selection?: ParticipantPreviewSelection,
): string {
  const path = origin === "publish" ? "/event/publish" : "/event/branding";
  return previewPath(path, locale, selection);
}

export function participantFormActions(
  draft: EventDraft,
): ParticipantFormKind[] {
  return (["registration", "survey"] as const).filter((kind) =>
    kind === "registration" ? draft.hasRegistration : draft.hasSurvey,
  );
}
