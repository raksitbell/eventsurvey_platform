"use client";

import EventDisplay, {
  type EventDisplayProps,
} from "@/components/participant/EventDisplay";
import { bannerObjectPosition } from "@/core/event/banner-layout";
import { getEventContent, resolveEventTranslation } from "@/core/event/content";
import { participantFormActions } from "@/core/event/participant";
import {
  eventColorForeground,
  participantColors,
} from "@/core/event/participant-colors";
import type { ParticipantEventData } from "@/types/event/participant";
import { useLocale, useTranslations } from "next-intl";
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";

const portraitCanvas = { width: 1080, height: 1920 };
const landscapeCanvas = { width: 1920, height: 1080 };

interface ParticipantDisplayPreviewProps extends ParticipantEventData {
  contentLocale?: string | null;
  fitContent?: boolean;
}

function formatDate(value: string | null, formatter: Intl.DateTimeFormat) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : formatter.format(date);
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

export default function ParticipantDisplayPreview({
  draft,
  branding,
  bannerUrl,
  contentLocale,
  fitContent = true,
}: ParticipantDisplayPreviewProps) {
  const locale = useLocale();
  const t = useTranslations("participantDisplay");
  const event = useTranslations("participantEvent");
  const dates = useTranslations("eventPublishedView");
  const previewText = useTranslations("eventPreview");
  const layout = branding.layout ?? "portrait";
  const size = layout === "landscape" ? landscapeCanvas : portraitCanvas;
  const frame = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const viewport = frame.current;
    const canvas = content.current;
    if (!viewport || !canvas) return;
    const measure = () => {
      const width = viewport.clientWidth;
      const height = canvas.offsetHeight;
      setBounds((current) =>
        current.width === width && current.height === height
          ? current
          : { width, height },
      );
    };
    measure();
    const observer = new globalThis.ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  const scale = Math.min(1, bounds.width / size.width);
  const height = Math.max(size.height, fitContent ? bounds.height : 0);
  const translation = resolveEventTranslation(
    getEventContent(draft, locale),
    contentLocale,
  );
  const dateFormatter = new Intl.DateTimeFormat(translation.localeCode, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
    calendar: "gregory",
    hourCycle: "h23",
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
    "--display-preview-height": `${size.height}px`,
    "--display-preview-surface": branding.secondary,
    "--display-preview-primary": branding.primary,
    "--display-preview-on-primary": eventColorForeground(branding.primary),
    "--display-preview-accent": colors["--participant-control-text"],
    "--display-preview-gradient":
      branding.backgroundMode === "gradient"
        ? `linear-gradient(${branding.gradientAngle ?? 0}deg, ${branding.secondary}, ${branding.gradientEnd ?? branding.primary})`
        : "none",
    "--display-preview-blur":
      branding.backgroundMode === "blur" && banner
        ? `url(${JSON.stringify(banner)})`
        : "none",
    "--display-preview-crop": bannerPosition ?? "center",
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
    <div
      ref={frame}
      className="relative mx-auto w-full min-w-0 overflow-hidden after:pointer-events-none after:absolute after:inset-0 after:border-2 after:border-solid after:border-event-banner/90 dark:after:border-brand-400"
      data-participant-display-preview
      data-layout={layout}
      role="region"
      aria-label={previewText("viewport")}
      style={{
        maxWidth: size.width,
        aspectRatio: size.width / size.height,
        height: scale ? height * scale : undefined,
      }}
    >
      <div
        ref={content}
        className="absolute start-0 top-0 origin-top-left rtl:origin-top-right"
        style={{
          width: size.width,
          height: fitContent ? undefined : size.height,
          transform: `scale(${scale})`,
          overflowY: fitContent ? undefined : "auto",
        }}
      >
        {scale > 0 && (
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
            preview={{
              contentLocale: translation.localeCode,
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
        )}
      </div>
    </div>
  );
}
