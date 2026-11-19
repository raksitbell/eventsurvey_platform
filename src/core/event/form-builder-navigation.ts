import { normalizeContentLocale } from "@/core/event/content";
import type { EventDetailIssue } from "@/core/event/draft";
import type { FormType } from "@/types/event/form";

export const detailInputIds = {
  eventName: "event-name",
  locationName: "event-location",
  startsAt: "event-start",
  endsAt: "event-end",
  surveyCustomClose: "post-survey-close",
} as const satisfies Record<EventDetailIssue["field"], string>;

const destinations = {
  details: "/event/details",
  forms: "/event/forms",
  publish: "/event/publish",
  whitelist: "/event/whitelist",
  management: "/event/form",
  workspace: "/event",
} as const;

type Origin = Exclude<keyof typeof destinations, "workspace">;
type WhitelistOrigin = "details" | "publish" | "workspace";
type QueryValue = string | readonly string[] | null | undefined;

export interface FormBuilderEntryQuery {
  from?: QueryValue;
  lang?: QueryValue;
  via?: QueryValue;
}

function singleValue(value: QueryValue) {
  if (typeof value === "string") return value;
  return value?.length === 1 ? value[0] : undefined;
}

export function formBuilderContentLocale(value: QueryValue) {
  return normalizeContentLocale(singleValue(value));
}

function whitelistOrigin(value: QueryValue): WhitelistOrigin {
  const origin = singleValue(value);
  return origin === "details" || origin === "publish" ? origin : "workspace";
}

function destinationHref(path: string, locale?: QueryValue, query = new URLSearchParams()) {
  const language = formBuilderContentLocale(locale);
  if (language) query.set("lang", language);
  return query.size ? `${path}?${query}` : path;
}

export function eventSetupStepHref(step: "details" | "publish", locale?: QueryValue) {
  return destinationHref(destinations[step], locale);
}

export function whitelistEntryHref(origin: WhitelistOrigin, locale?: QueryValue) {
  if (origin === "workspace") return destinations.whitelist;
  return destinationHref(destinations.whitelist, locale, new URLSearchParams({ from: origin }));
}

export function whitelistReturn(query: FormBuilderEntryQuery) {
  const origin = whitelistOrigin(query.from);
  return { origin, href: destinationHref(destinations[origin], origin === "workspace" ? null : query.lang) };
}

export function formBuilderEntryHref(
  path: `/event/${"setup" | "form"}/${FormType}`,
  origin: Exclude<Origin, "management">,
  locale?: QueryValue,
  via?: WhitelistOrigin,
) {
  const query = new URLSearchParams({ from: origin });
  if (origin === "whitelist" && via && via !== "workspace") query.set("via", via);
  return destinationHref(path, origin === "forms" ? null : locale, query);
}

export function formBuilderReturn(query: FormBuilderEntryQuery, insideSetup: boolean) {
  const requested = singleValue(query.from);
  if (requested === "whitelist") {
    return { origin: requested, href: whitelistEntryHref(whitelistOrigin(query.via), query.lang) } as const;
  }
  let origin: Origin = insideSetup ? "details" : "management";
  if (insideSetup && (requested === "forms" || requested === "publish")) origin = requested;
  return {
    origin,
    href: destinationHref(destinations[origin], origin === "details" || origin === "publish" ? query.lang : null),
  };
}
