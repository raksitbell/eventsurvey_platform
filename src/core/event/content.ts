import type {
  EventContent,
  EventContentTranslation,
} from "@/types/event/content";
import { z } from "zod";

// Alpha-2 column of the Library of Congress ISO 639 code list.
// https://www.loc.gov/standards/iso639-2/php/code_list.php
export const contentLanguageCodes: readonly string[] =
  `aa ab ae af ak am an ar as av ay az ba be bg bi bm bn bo br bs ca ce ch
   co cr cs cu cv cy da de dv dz ee el en eo es et eu fa ff fi fj fo fr fy
   ga gd gl gn gu gv ha he hi ho hr ht hu hy hz ia id ie ig ii ik io is it
   iu ja jv ka kg ki kj kk kl km kn ko kr ks ku kv kw ky la lb lg li ln lo
   lt lu lv mg mh mi mk ml mn mr ms mt my na nb nd ne ng nl nn no nr nv ny
   oc oj om or os pa pi pl ps pt qu rm rn ro ru rw sa sc sd se sg si sk sl
   sm sn so sq sr ss st su sv sw ta te tg th ti tk tl tn to tr ts tt tw ty
   ug uk ur uz ve vi vo wa wo xh yi yo za zh zu`.split(/\s+/);

const languageCodes = new Set(contentLanguageCodes);

export function normalizeContentLocale(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim();
  if (!/^[a-z]{2}$/i.test(code)) return null;
  const normalized = code.toLowerCase();
  return languageCodes.has(normalized) ? normalized : null;
}

const contentLocaleSchema = z.string().transform((value, context) => {
  const code = normalizeContentLocale(value);
  if (code) return code;
  context.addIssue({
    code: "custom",
    message: "Expected an ISO 639-1 language code",
  });
  return z.NEVER;
});

export const eventContentSchema = z
  .object({
    defaultLocale: contentLocaleSchema,
    translations: z
      .array(
        z.object({
          localeCode: contentLocaleSchema,
          title: z.string().max(255),
          description: z.string().max(5000).nullable(),
          locationName: z.string().max(500).nullable(),
          floorZone: z.string().max(500).nullable(),
        }),
      )
      .min(1),
  })
  .refine(
    ({ defaultLocale, translations }) => {
      const codes = new Set(translations.map(({ localeCode }) => localeCode));
      return codes.has(defaultLocale) && codes.size === translations.length;
    },
    {
      path: ["translations"],
      message: "Expected unique languages and an existing default",
    },
  );

export function emptyEventTranslation(
  localeCode: string,
): EventContentTranslation {
  return {
    localeCode,
    title: "",
    description: null,
    locationName: null,
    floorZone: null,
  };
}

export function resolveEventTranslation(
  content: EventContent,
  requested?: string | null,
): EventContentTranslation {
  const code = normalizeContentLocale(requested);
  return (
    content.translations.find(({ localeCode }) => localeCode === code) ??
    content.translations.find(
      ({ localeCode }) => localeCode === content.defaultLocale,
    ) ??
    content.translations[0] ??
    emptyEventTranslation(content.defaultLocale)
  );
}

interface ContentSource {
  content?: EventContent;
  eventName: string;
  description: string | null;
  locationName: string | null;
  locationDetail?: string;
}

export function getEventContent(
  data: ContentSource,
  locale?: string,
): EventContent {
  if (data.content) return data.content;
  const defaultLocale = normalizeContentLocale(locale) ?? "th";
  return {
    defaultLocale,
    translations: [
      {
        localeCode: defaultLocale,
        title: data.eventName,
        description: data.description,
        locationName: data.locationName,
        floorZone: data.locationDetail ?? null,
      },
    ],
  };
}

export function projectEventContent<T extends ContentSource>(
  data: T,
  locale?: string,
): T {
  if (!data.content) return data;
  const translation = resolveEventTranslation(data.content, locale);
  return {
    ...data,
    eventName: translation.title,
    description: translation.description,
    locationName: translation.locationName,
    locationDetail: translation.floorZone ?? undefined,
  };
}

export function contentLanguageName(
  code: string,
  displayLocale = code,
): string {
  try {
    return (
      new Intl.DisplayNames(displayLocale, { type: "language" }).of(code) ??
      code
    );
  } catch {
    return code;
  }
}
