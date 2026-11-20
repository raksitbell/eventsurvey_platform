import { routing, type Locale } from "@/i18n/routing";
import type { MockEventTranslation } from "@/types/mock";

/** Resolve event display title from `event_translations` for a locale. */
export function resolveEventTitle(
  translations: MockEventTranslation[],
  eventId: string,
  locale: Locale,
): string | null {
  const forEvent = translations.filter((row) => row.event_id === eventId);
  if (forEvent.length === 0) return null;

  const preferred =
    forEvent.find((row) => row.locale_code === locale) ??
    forEvent.find((row) => row.locale_code === routing.defaultLocale) ??
    forEvent[0];

  return preferred?.title ?? null;
}
