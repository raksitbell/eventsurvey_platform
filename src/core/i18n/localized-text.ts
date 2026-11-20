import { routing, type Locale } from "@/i18n/routing";
import type { LocalizedText } from "@/types/localization";

/** Resolve mock API text to a renderable string before it reaches the UI. */
export function localizeText(
  value: string | LocalizedText,
  locale: Locale,
): string {
  if (typeof value === "string") return value;

  return (
    value[locale] ??
    value[routing.defaultLocale] ??
    Object.values(value).find((translation) => Boolean(translation)) ??
    ""
  );
}
