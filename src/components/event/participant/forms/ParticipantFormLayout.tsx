"use client";

import { eventInter, eventThai } from "@/components/event/setup/event-admin-fonts";
import EventDisplayLanguage from "@/components/participant/EventDisplayLanguage";
import { bannerLayouts, bannerObjectPosition } from "@/core/event/banner-layout";
import { eventColorForeground, participantColors } from "@/core/event/participant-colors";
import { toBangkokInput } from "@/core/i18n/bangkok-datetime";
import { Link } from "@/i18n/navigation";
import type { EventBranding } from "@/types/event/branding";
import type { ParticipantFormEventDetails, ParticipantFormKind } from "@/types/event/participant";
import { useTranslations } from "next-intl";
import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import "./participant-form.css";

interface Props {
  details: ParticipantFormEventDetails;
  branding: EventBranding;
  bannerUrl: string | null;
  kind: ParticipantFormKind;
  locale: string;
  showMobileFooter: boolean;
  readOnly: boolean;
  fillViewport: boolean;
  eventHref?: string;
  children: ReactNode;
}

function EventIdentity({ branding, title }: { branding: EventBranding; title: string }) {
  const name = branding.organizer?.trim() || title;
  const wordmark = branding.identity === "wordmark" ? branding.wordmark : null;
  if (wordmark) {
    return <Image unoptimized src={wordmark.url} width={236} height={48} alt={name || wordmark.name} className="h-12 w-auto max-w-full rounded-xl bg-white object-contain px-3 py-1" />;
  }
  return (
    <>
      {branding.identity !== "wordmark" && branding.logo ? (
        <Image unoptimized src={branding.logo.url} width={42} height={42} alt="" className="size-11 shrink-0 rounded-xl bg-white object-contain" />
      ) : name ? (
        <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl bg-(--participant-accent) text-xl font-bold text-(--participant-on-accent)">
          {Array.from(name)[0]}
        </span>
      ) : null}
      <span className="min-w-0 wrap-anywhere">
        <span className="block font-bold">{name}</span>
        {branding.tagline && <span className="block text-theme-xs">{branding.tagline}</span>}
      </span>
    </>
  );
}

function scheduleLabel(details: ParticipantFormEventDetails, locale: string) {
  const formatter = new Intl.DateTimeFormat(locale, {
    day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok",
  });
  return [details.startsAt, details.endsAt].map((value) => {
    const wallTime = toBangkokInput(value);
    return value && wallTime ? `${formatter.format(new Date(value))} ${wallTime.slice(11)}` : "";
  }).filter(Boolean).join(" – ");
}

export default function ParticipantFormLayout({
  details, branding, bannerUrl, kind, locale, showMobileFooter, readOnly, fillViewport, eventHref, children,
}: Props) {
  const t = useTranslations("publicParticipantForm");
  const labels = useTranslations("participantEvent");
  const banner = branding.banner?.url ?? bannerUrl;
  const layout = branding.layout ?? "portrait";
  const aspect = bannerLayouts[layout];
  const schedule = scheduleLabel(details, locale);
  const location = [details.locationName, details.locationDetail].filter(Boolean).join(" · ");
  const Container = readOnly ? "section" : "main";
  const colors = participantColors(branding);
  const style = {
    ...colors,
    "--participant-on-accent": eventColorForeground(branding.accent),
    "--color-brand-500": colors["--participant-control-text"],
    "--display-text": "var(--color-participant-text)",
    "--display-tint": "var(--color-event-display-tint)",
    "--form-banner-position": bannerObjectPosition(branding.banner?.cropPosition) ?? "center",
  } as CSSProperties;
  const backgroundImage = branding.backgroundMode === "gradient"
    ? `linear-gradient(${branding.gradientAngle ?? 0}deg, ${branding.secondary}, ${branding.gradientEnd ?? branding.primary})`
    : undefined;
  const identity = <EventIdentity branding={branding} title={details.eventName} />;
  const organizer = branding.organizer?.trim();
  return (
    <Container
      style={style}
      className={`${eventInter.variable} ${eventThai.variable} participant-form-page @container/participant flex min-w-0 w-full flex-col bg-(--participant-secondary) ${fillViewport ? "grow shrink-0" : readOnly ? "" : "min-h-dvh"}`}
    >
      <header className="flex min-h-18 shrink-0 items-center justify-between gap-4 bg-(--participant-header-surface) px-4 py-2 text-(--participant-on-header) @4xl/participant:min-h-20 @4xl/participant:px-16">
        {eventHref ? (
          <Link href={eventHref} aria-label={t("backToEvent")} className="flex min-w-0 items-center gap-3">{identity}</Link>
        ) : <div className="flex min-w-0 items-center gap-3">{identity}</div>}
        {readOnly ? (
          <span className="rounded-full bg-white px-3 py-2 text-theme-xs font-semibold text-participant-text">{locale.toUpperCase()}</span>
        ) : <EventDisplayLanguage />}
      </header>
      <div className="relative isolate grow" style={{ backgroundImage }}>
        {branding.backgroundMode === "blur" && banner && (
          <div className="pointer-events-none absolute inset-0 -z-1 overflow-hidden" aria-hidden="true">
            <div className="size-full scale-105 bg-cover bg-position-(--form-banner-position) opacity-60 blur-lg" style={{ backgroundImage: `url(${JSON.stringify(banner)})` }} />
          </div>
        )}
        <div className="participant-form-body">
          {banner && (
            <Image
              src={banner} alt={labels("banner")} width={aspect.width} height={aspect.height} unoptimized
              data-layout={layout}
              className="participant-form-banner block h-auto w-full rounded-2xl object-contain @4xl/participant:rounded-3xl"
              style={{ aspectRatio: `${aspect.width}/${aspect.height}` }}
            />
          )}
          <section className="participant-form-intro min-w-0 wrap-anywhere">
            <p className="text-theme-xs font-semibold text-participant-muted">
              {t("eventInformation")}
            </p>
            <h2 className="text-2xl leading-snug font-bold @4xl/participant:text-3xl">{details.eventName || labels("namePending")}</h2>
            {organizer && (
              <p className="flex items-center gap-2 text-theme-sm font-semibold">
                <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-lg bg-(--participant-secondary) text-(--participant-link)">{Array.from(organizer)[0]}</span>
                {t("organizedBy", { name: organizer })}
              </p>
            )}
            {(schedule || location) && (
              <dl className="participant-form-facts">
                {schedule && <div><dt>{t("dateTime")}</dt><dd>{schedule}</dd></div>}
                {location && <div><dt>{t("venue")}</dt><dd>{location}</dd></div>}
              </dl>
            )}
            {details.description && (
              <div className="space-y-1 border-t border-preview-border pt-3">
                <p className="text-theme-xs font-semibold text-participant-muted">{t("about")}</p>
                <p className="whitespace-pre-line">{details.description}</p>
              </div>
            )}
          </section>
          <section className="participant-form-card w-full min-w-0 space-y-4 rounded-2xl border border-preview-border bg-white px-4 py-6 text-participant-text @4xl/participant:rounded-3xl @4xl/participant:px-9 @4xl/participant:py-8">
            <span className="participant-form-badge">{t(kind === "registration" ? "registrationBadge" : "surveyBadge")}</span>
            {children}
          </section>
        </div>
      </div>
      <footer className={`min-h-15 shrink-0 items-center justify-center bg-(--participant-footer-surface) px-4 py-3 text-theme-xs text-(--participant-on-footer) ${showMobileFooter ? "flex" : "hidden @4xl/participant:flex"}`}>
        © EventSurvey
      </footer>
    </Container>
  );
}
