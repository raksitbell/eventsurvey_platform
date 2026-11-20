import type { Filters } from "@/types/event/analytics";
export class AnalyticsError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function parseFilters(params: URLSearchParams): Filters {
  const from = params.get("from") || "",
    to = params.get("to") || "";
  for (const date of [from, to])
    if (
      date &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Date.parse(date)) ||
        new Date(date).toISOString().slice(0, 10) !== date)
    )
      throw new AnalyticsError(400, "INVALID_DATE");
  if (from && to && from > to)
    throw new AnalyticsError(400, "INVALID_DATE_RANGE");
  const raw = params.get("raw");
  if (raw && raw !== "true" && raw !== "false")
    throw new AnalyticsError(400, "INVALID_MODE");
  const locale = params.get("locale") || "th";
  if (locale !== "th" && locale !== "en")
    throw new AnalyticsError(400, "INVALID_LOCALE");
  return {
    eventId: params.get("eventId") || "",
    formId: params.get("formId") || "",
    from,
    to,
    locale,
    raw: raw === "true",
  };
}
export function localDay(iso: string, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}
export function csvCell(value: string): string {
  const safe = /^[\s]*[=+@-]|^[\t\r\n]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
