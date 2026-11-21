import { eventContentSchema, getEventContent, normalizeContentLocale } from "@/core/event/content";
import type { EventContent } from "@/types/event/content";
import type { MockEvent, MockEventTranslation } from "@/types/mock";

export function bindEventContent(
  event: MockEvent,
  rows: MockEventTranslation[],
): EventContent {
  const translations: EventContent["translations"] = [];
  const seen = new Set<string>();
  for (const row of [...rows].sort(
    (a, b) => (a.display_order ?? Infinity) - (b.display_order ?? Infinity),
  )) {
    const localeCode = normalizeContentLocale(row.locale_code);
    if (row.event_id !== event.id || !localeCode || seen.has(localeCode))
      continue;
    const parsed = eventContentSchema.safeParse({
      defaultLocale: localeCode,
      translations: [
        {
          localeCode,
          title: row.title,
          description: row.description ?? null,
          locationName: row.location_name ?? null,
          floorZone: row.floor_zone ?? null,
        },
      ],
    });
    if (parsed.success) {
      seen.add(localeCode);
      translations.push(parsed.data.translations[0]);
    }
  }

  const defaultLocale = normalizeContentLocale(event.default_locale);
  if (!translations.length) {
    return getEventContent(
      { eventName: event.slug, description: null, locationName: null },
      defaultLocale ?? undefined,
    );
  }
  return {
    defaultLocale:
      (defaultLocale && seen.has(defaultLocale) ? defaultLocale : null) ??
      translations[0].localeCode,
    translations,
  };
}
