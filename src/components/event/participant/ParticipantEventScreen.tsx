"use client";

import EventDisplay, {
  type EventDisplayProps,
} from "@/components/participant/EventDisplay";
import { bannerLayouts, bannerObjectPosition, displayCanvasSize } from "@/core/event/banner-layout";
import { getEventContent, resolveEventTranslation } from "@/core/event/content";
import { participantFormActions } from "@/core/event/participant";
import { toBangkokInput } from "@/core/i18n/bangkok-datetime";
import {
  eventColorForeground,
  participantColors,
} from "@/core/event/participant-colors";
import type { ParticipantEventData } from "@/types/event/participant";
import { useLocale, useTranslations } from "next-intl";
import type { PublicEvent } from "@/types/event/public-event";
import type { CSSProperties } from "react";

interface ParticipantEventScreenProps extends ParticipantEventData {
  displayOnly?: boolean;
  contentLocale?: string | null;
  formLinks?: PublicEvent["formLinks"];
}

function formatDate(value: string | null, formatter: Intl.DateTimeFormat) {
  const wallTime = toBangkokInput(value);
  if (!wallTime || !value) return null;
  // Combined date/time formats differ across Node and browser ICU versions.
  return `${formatter.format(new Date(value))} ${wallTime.slice(11)}`;
}

function displayChannels(
  channels: ParticipantEventData["branding"]["channels"],
) {
  const unique = new Map<
    string,
    { key: string; platform: string; label: string }
  >();
  for (const { platform, url } of channels ?? []) {
    let address: URL;
    try {
      address = new URL(url);
    } catch {
      continue;
    }
    if (address.protocol !== "https:" && address.protocol !== "http:") continue;
    const key = `${platform}-${address.href}`;
    const label =
      address.pathname.split("/").filter(Boolean).at(-1) || address.hostname;
    unique.set(key, { key, platform, label });
  }
  return [...unique.values()];
}

export default function ParticipantEventScreen({
  draft, branding, bannerUrl, contentLocale, formLinks, displayOnly,
}: ParticipantEventScreenProps) {
  const locale = useLocale();
  const t = useTranslations("participantDisplay");
  const event = useTranslations("participantEvent");
  const dates = useTranslations("eventPublishedView");
  const layout = branding.layout ?? "portrait";
  const size = displayCanvasSize(layout);
  const content = getEventContent(draft, locale);
  const translation = resolveEventTranslation(content, contentLocale);
  const dateFormatter = new Intl.DateTimeFormat(translation.localeCode, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
    calendar: "gregory",
  });
  const start = formatDate(draft.startsAt, dateFormatter);
  const end = formatDate(draft.endsAt, dateFormatter);
  const organizer = branding.organizer?.trim() || t("organizer");
  const wordmark = branding.identity === "wordmark";
  const logo = wordmark ? branding.wordmark : branding.logo;
  const banner = branding.banner?.url ?? bannerUrl;
  const bannerPosition = bannerObjectPosition(branding.banner?.cropPosition);
  const colors = participantColors(branding);
  const style = {
    "--display-banner-ratio": bannerLayouts[layout].width / bannerLayouts[layout].height,
    "--display-canvas-width": `${size.width}px`,
    "--display-canvas-height": `${size.height}px`,
    "--display-event-surface": branding.secondary,
    "--display-event-primary": branding.primary,
    "--display-event-on-primary": eventColorForeground(branding.primary),
    "--display-event-accent": colors["--participant-control-text"],
    "--display-event-gradient":
      branding.backgroundMode === "gradient"
        ? `linear-gradient(${branding.gradientAngle ?? 0}deg, ${branding.secondary}, ${branding.gradientEnd ?? branding.primary})`
        : "none",
    "--display-event-blur":
      branding.backgroundMode === "blur" && banner
        ? `url(${JSON.stringify(banner)})`
        : "none",
    "--display-event-crop": bannerPosition ?? "center",
  } as CSSProperties;
  const data: EventDisplayProps["data"] = {
    title: translation.title.trim() || event("namePending"),
    organizer,
    organizerInitial:
      [...organizer][0]?.toLocaleUpperCase(translation.localeCode) ??
      t("organizerInitial"),
    startsAt: start ? dates("starts", { date: start }) : event("datePending"),
    endsAt: end ? dates("ends", { date: end }) : "",
    location: translation.locationName?.trim() || event("locationPending"),
    locationDetail: translation.floorZone ?? "",
    description: translation.description?.trim() ?? "",
    socialHandle: "",
  };

  return (
    <EventDisplay
      layout={layout}
      data={data}
      labels={{
        hostedBy: t("hostedBy"),
        hostedBySubtitle: t("hostedBySubtitle"),
        about: t("about"),
        aboutSubtitle: t("aboutSubtitle"),
        registration: t("registration"),
        survey: t("survey"),
        bannerPlaceholder: t("bannerPlaceholder"),
        qrPlaceholder: t("qrPlaceholder"),
      }}
      displayOnly={displayOnly}
      formLinks={formLinks}
      event={{
        contentLocale: translation.localeCode,
        languages: content.translations.map((row) => row.localeCode),
        banner,
        bannerLabel: event("banner"),
        bannerPosition,
        logo: logo ? { src: logo.url, wordmark } : null,
        tagline: branding.tagline,
        channels: displayChannels(branding.channels),
        forms: participantFormActions(draft),
        style,
      }}
    />
  );
}
