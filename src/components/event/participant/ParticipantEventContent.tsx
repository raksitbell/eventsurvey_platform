"use client";

import {
  bannerLayouts,
  bannerObjectPosition,
} from "@/core/event/banner-layout";
import { participantFormActions } from "@/core/event/participant";
import type { ParticipantEventData } from "@/types/event/participant";
import {
  CalendarDaysIcon,
  ClockIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";
import { useFormatter, useTranslations } from "next-intl";
import Image from "next/image";
export default function ParticipantEventContent({
  draft,
  branding,
  bannerUrl,
}: ParticipantEventData) {
  const t = useTranslations("participantEvent");
  const display = useTranslations("participantDisplay");
  const format = useFormatter();
  const banner = branding.banner?.url ?? bannerUrl;
  const cropPosition = bannerObjectPosition(branding.banner?.cropPosition);
  const { width, height } = bannerLayouts[branding.layout ?? "portrait"];
  const blurredBanner = branding.backgroundMode === "blur" ? banner : null;
  const gradient =
    branding.backgroundMode === "gradient"
      ? `linear-gradient(${branding.gradientAngle ?? 0}deg, ${branding.secondary}, ${branding.gradientEnd ?? branding.primary})`
      : undefined;
  const date = (value: string) =>
    format.dateTime(new Date(value), {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Bangkok",
      calendar: "gregory",
    });
  const time = (value: string) =>
    format.dateTime(new Date(value), {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: "Asia/Bangkok",
    });
  const forms = participantFormActions(draft);
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
          className="aspect-3/4 w-full shrink-0 overflow-hidden bg-(--participant-primary) @4xl/participant:w-(--container-participant-banner)"
          style={cropPosition ? { aspectRatio: width / height } : undefined}
        >
          {banner && (
            <Image
              src={banner}
              alt={t("banner")}
              width={450}
              height={600}
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
            {draft.eventName || t("namePending")}
          </h1>
          <div className="flex items-start gap-2 text-xl font-bold text-(--participant-on-secondary) @4xl/participant:text-2xl dark:text-(--participant-on-secondary)">
            <MapPinIcon
              className="mt-0.5 size-6 shrink-0 @4xl/participant:size-7"
              aria-hidden="true"
            />
            <div className="min-w-0 wrap-anywhere">
              <p>{draft.locationName || t("locationPending")}</p>
              {draft.locationDetail && (
                <p className="text-base font-medium">{draft.locationDetail}</p>
              )}
            </div>
          </div>
          <div className="flex items-start gap-2 text-xl font-bold text-(--participant-on-secondary) @4xl/participant:text-2xl dark:text-(--participant-on-secondary)">
            <CalendarDaysIcon
              className="mt-0.5 size-6 shrink-0 @4xl/participant:size-7"
              aria-hidden="true"
            />
            <p>
              {draft.startsAt ? date(draft.startsAt) : t("datePending")}
              {draft.endsAt &&
                (!draft.startsAt ||
                  date(draft.startsAt) !== date(draft.endsAt)) && (
                  <> – {date(draft.endsAt)}</>
                )}
            </p>
          </div>
          <div className="flex items-start gap-2 text-xl font-bold text-(--participant-on-secondary) @4xl/participant:text-2xl dark:text-(--participant-on-secondary)">
            <ClockIcon
              className="mt-0.5 size-6 shrink-0 @4xl/participant:size-7"
              aria-hidden="true"
            />
            <p>
              {draft.startsAt ? time(draft.startsAt) : "—"}
              {draft.endsAt && <> – {time(draft.endsAt)}</>}
            </p>
          </div>
          {draft.description && (
            <div className="space-y-1 text-(--participant-on-secondary) dark:text-(--participant-on-secondary)">
              <h2 className="font-semibold">{display("about")}</h2>
              <p className="wrap-anywhere whitespace-pre-line">
                {draft.description}
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
          <div className="flex flex-wrap justify-around gap-4 px-4 py-1">
            {forms.map((kind) => (
              <div
                key={kind}
                className="flex w-32 flex-col items-center text-center @4xl/participant:w-36"
              >
                <span className="text-base font-semibold text-(--participant-link) @4xl/participant:text-xl dark:text-(--participant-link)">
                  {t(kind === "registration" ? "registrationQr" : "surveyQr")}
                </span>
                <Image
                  src={`/images/event-preview/${kind}.svg`}
                  alt={t("qrAlt", { form: t(kind) })}
                  width={126}
                  height={126}
                  className="my-1 h-auto w-25 bg-white @4xl/participant:w-31.5"
                />
                <span className="text-theme-xs text-(--participant-on-secondary) @4xl/participant:text-base dark:text-(--participant-on-secondary)">
                  {t(
                    kind === "registration" ? "registrationHint" : "surveyHint",
                  )}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
