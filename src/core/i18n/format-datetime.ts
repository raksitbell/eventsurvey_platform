import type { Locale } from "@/i18n/routing";

type DateTimeInput = string | number | Date;

const DEFAULT_OPTIONS: Intl.DateTimeFormatOptions = {
  dateStyle: "short",
  timeStyle: "short",
};

/** Format an instant for display using the app locale (th / en), not the browser default. */
export function formatDateTime(
  value: DateTimeInput,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = DEFAULT_OPTIONS,
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(locale, options);
}
