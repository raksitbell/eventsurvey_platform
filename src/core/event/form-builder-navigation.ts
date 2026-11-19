import { normalizeContentLocale } from "@/core/event/content";
import type { FormType } from "@/types/event/form";

const destinations = {
  details: "/event/details",
  forms: "/event/forms",
  publish: "/event/publish",
  whitelist: "/event/whitelist",
  management: "/event/form",
} as const;

type Origin = keyof typeof destinations;
type QueryValue = string | readonly string[] | null | undefined;

export interface FormBuilderEntryQuery {
  from?: QueryValue;
  lang?: QueryValue;
}

function singleValue(value: QueryValue) {
  if (typeof value === "string") return value;
  return value?.length === 1 ? value[0] : undefined;
}

export function formBuilderContentLocale(value: QueryValue) {
  return normalizeContentLocale(singleValue(value));
}

export function formBuilderEntryHref(
  path: `/event/${"setup" | "form"}/${FormType}`,
  origin: Exclude<Origin, "management">,
  locale?: QueryValue,
) {
  const query = new URLSearchParams({ from: origin });
  const language = formBuilderContentLocale(locale);
  if ((origin === "details" || origin === "publish") && language) {
    query.set("lang", language);
  }
  return `${path}?${query}`;
}

export function formBuilderReturn(query: FormBuilderEntryQuery, insideSetup: boolean) {
  const requested = singleValue(query.from);
  let origin: Origin = insideSetup ? "details" : "management";
  if (
    requested === "whitelist" ||
    (insideSetup && (requested === "forms" || requested === "publish"))
  ) {
    origin = requested;
  }
  const language = formBuilderContentLocale(query.lang);
  const path = destinations[origin];
  return {
    origin,
    href: (origin === "details" || origin === "publish") && language
      ? `${path}?lang=${language}`
      : path,
  };
}
