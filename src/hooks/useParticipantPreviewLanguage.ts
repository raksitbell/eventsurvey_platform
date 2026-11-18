"use client";

import {
  getEventContent,
  normalizeContentLocale,
  resolveEventTranslation,
} from "@/core/event/content";
import type { EventDraft } from "@/types/event/setup";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function useParticipantPreviewLanguage(draft: EventDraft) {
  const locale = useLocale();
  const languageParams = useSearchParams().getAll("lang");
  const routeLocale =
    languageParams.length === 1 ? normalizeContentLocale(languageParams[0]) : null;
  const [selection, setSelection] = useState<{
    routeLocale: string | null;
    locale: string;
  } | null>(null);
  const content = getEventContent(draft, locale);
  const requestedLocale =
    selection?.routeLocale === routeLocale ? selection.locale : routeLocale;
  const translation = resolveEventTranslation(content, requestedLocale);

  return {
    content,
    translation,
    contentLocale:
      draft.content || requestedLocale ? translation.localeCode : null,
    selectLanguage: (nextLocale: string) =>
      setSelection({ routeLocale, locale: nextLocale }),
  };
}
