import type { Locale } from "@/i18n/routing";

/** Text supplied by the mock API in one or more supported locales. */
export type LocalizedText = Partial<Record<Locale, string>>;
