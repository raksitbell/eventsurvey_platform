"use client";

import ParticipantFormActions from "@/components/event/participant/ParticipantFormActions";
import {
  bannerLayouts,
  bannerObjectPosition,
} from "@/core/event/banner-layout";
import type { EventContentTranslation } from "@/types/event/content";
import type { ParticipantEventData } from "@/types/event/participant";
import type { PublicEvent } from "@/types/event/public-event";
import {
  CalendarDaysIcon,
  ClockIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import Image from "next/image";

interface ParticipantEventContentProps extends ParticipantEventData {
  formLinks?: PublicEvent["formLinks"];
  translation: EventContentTranslation;
}

export default function ParticipantEventContent({
  draft,
  branding,
  bannerUrl,
  formLinks,
  translation,
}: ParticipantEventContentProps) {
  const t = useTranslations("participantEvent");
  const display = useTranslations("participantDisplay");
  const banner = branding.banner?.url ?? bannerUrl;
  const cropPosition = bannerObjectPosition(branding.banner?.cropPosition);
  const { width, height } = bannerLayouts[branding.layout ?? "portrait"];
  const blurredBanner = branding.backgroundMode === "blur" ? banner : null;
  const gradient =
    branding.backgroundMode === "gradient"
      ? `linear-gradient(${branding.gradientAngle ?? 0}deg, ${branding.secondary}, ${branding.gradientEnd ?? branding.primary})`
      : undefined;
  const { localeCode, title, locationName, floorZone, description } =
    translation;
  const dateFormatter = new Intl.DateTimeFormat(localeCode, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Bangkok",
    calendar: "gregory",
  });
  const timeFormatter = new Intl.DateTimeFormat(localeCode, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Bangkok",
  });
  const startDate = draft.startsAt
    ? dateFormatter.format(new Date(draft.startsAt))
    : null;
  const endDate = draft.endsAt
    ? dateFormatter.format(new Date(draft.endsAt))
    : null;
  return (
    <main
      className="relative isolate flex-1 overflow-hidden bg-(--participant-surface) pb-6 @4xl/participant:py-11 dark:bg-(--participant-surface)"
      style={gradient ? { backgroundImage: gradient } : undefined}
    >
      {blurredBanner && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-1 scale-110 bg-cover opacity-60 blur-lg"
          style={{
            backgroundImage: `url(${JSON.stringify(blurredBanner)})`,
            backgroundPosition: cropPosition,
          }}
        />
      )}
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 bg-transparent @4xl/participant:flex-row @4xl/participant:gap-10 @4xl/participant:bg-transparent dark:bg-transparent dark:@4xl/participant:bg-transparent">
        <div
          className="w-full shrink-0 overflow-hidden bg-(--participant-primary) @4xl/participant:w-(--container-participant-banner)"
          style={{ aspectRatio: width / height }}
        >
          {banner && (
            <Image
              src={banner}
              alt={t("banner")}
              width={width}
              height={height}
              unoptimized
              className="size-full object-cover"
              style={{ objectPosition: cropPosition }}
            />
          )}
        </div>
        <section
          className={`flex w-full min-w-0 flex-col gap-2 px-4 pb-6 @4xl/participant:max-w-md @4xl/participant:pb-0 ${gradient || blurredBanner ? "rounded-preview-control bg-(--participant-surface) py-4 @4xl/participant:p-4 dark:bg-(--participant-surface)" : ""}`}
        >
          <h1 className="text-title-sm font-bold wrap-anywhere whitespace-pre-line text-(--participant-on-secondary) @4xl/participant:text-title-md dark:text-(--participant-on-secondary)">
            {title.trim() ? (
              <bdi lang={localeCode}>{title}</bdi>
            ) : (
              t("namePending")
            )}
          </h1>
          <div className="flex items-start gap-2 text-xl font-bold text-(--participant-on-secondary) @4xl/participant:text-2xl dark:text-(--participant-on-secondary)">
            <MapPinIcon
              className="mt-0.5 size-6 shrink-0 @4xl/participant:size-7"
              aria-hidden="true"
            />
            <div className="min-w-0 wrap-anywhere">
              <p>
                {locationName?.trim() ? (
                  <bdi lang={localeCode}>{locationName}</bdi>
                ) : (
                  t("locationPending")
                )}
              </p>
              {floorZone?.trim() && (
                <p className="text-base font-medium whitespace-pre-line">
                  <bdi lang={localeCode}>{floorZone}</bdi>
                </p>
              )}
            </div>
          </div>
          <div className="flex items-start gap-2 text-xl font-bold text-(--participant-on-secondary) @4xl/participant:text-2xl dark:text-(--participant-on-secondary)">
            <CalendarDaysIcon
              className="mt-0.5 size-6 shrink-0 @4xl/participant:size-7"
              aria-hidden="true"
            />
            <p>
              {startDate ? (
                <bdi lang={localeCode}>{startDate}</bdi>
              ) : (
                t("datePending")
              )}
              {endDate && startDate !== endDate && (
                <>
                  {" "}
                  – <bdi lang={localeCode}>{endDate}</bdi>
                </>
              )}
            </p>
          </div>
          <div className="flex items-start gap-2 text-xl font-bold text-(--participant-on-secondary) @4xl/participant:text-2xl dark:text-(--participant-on-secondary)">
            <ClockIcon
              className="mt-0.5 size-6 shrink-0 @4xl/participant:size-7"
              aria-hidden="true"
            />
            <p lang={localeCode} dir="auto">
              {draft.startsAt
                ? timeFormatter.format(new Date(draft.startsAt))
                : "—"}
              {draft.endsAt && (
                <> – {timeFormatter.format(new Date(draft.endsAt))}</>
              )}
            </p>
          </div>
          {description?.trim() && (
            <div className="space-y-1 text-(--participant-on-secondary) dark:text-(--participant-on-secondary)">
              <h2 className="font-semibold">{display("about")}</h2>
              <p
                lang={localeCode}
                dir="auto"
                className="wrap-anywhere whitespace-pre-line"
              >
                {description}
              </p>
            </div>
          )}
          {!!branding.channels?.length && (
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-(--participant-on-secondary) dark:text-(--participant-on-secondary)">
              {branding.channels.map(({ platform, url }) => {
                const channel = new URL(url);
                const name =
                  channel.pathname.split("/").filter(Boolean).at(-1) ||
                  channel.hostname;
                return (
                  <li key={`${platform}-${url}`} className="wrap-anywhere">
                    {platform} · {name}
                  </li>
                );
              })}
            </ul>
          )}
          <ParticipantFormActions draft={draft} formLinks={formLinks} />
        </section>
      </div>
    </main>
  );
}
