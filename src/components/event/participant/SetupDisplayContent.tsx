import Image from "next/image";
import EventDisplayBanner from "@/components/participant/EventDisplayBanner";
import { CalendarDaysIcon, MapPinIcon } from "@heroicons/react/24/outline";
import type { ParticipantEventData } from "@/types/event/participant";
import { participantColors } from "@/core/event/participant-colors";
import type { CSSProperties } from "react";
import { useFormatter, useTranslations } from "next-intl";
import "@/components/participant/event-display.css";
import "./setup-display.css";

export default function SetupDisplayContent({
  draft,
  branding,
  bannerUrl,
}: ParticipantEventData) {
  const t = useTranslations("participantDisplay"),
    s = useTranslations("eventSetup");
  const fmt = useFormatter();
  const date = (v: string | null) =>
    v
      ? fmt.dateTime(new Date(v), {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Asia/Bangkok",
        })
      : "—";
  const logo =
    branding.identity === "wordmark" ? branding.wordmark : branding.logo;
  const layout = branding.layout ?? "portrait";
  const banner = branding.banner?.url ?? bannerUrl;
  const forms = [
    ...(draft.hasRegistration ? ["registration"] : []),
    ...(draft.hasSurvey ? ["survey"] : []),
  ];
  return (
    <article
      className={`participant-display participant-display--${layout} setup-display`}
      style={participantColors(branding) as CSSProperties}
    >
      <div className="participant-content">
        {banner ? (
          <Image
            src={banner}
            alt={s("bannerRatio")}
            width={1920}
            height={1200}
            unoptimized
            className={`participant-banner participant-banner--${layout} border-none! object-cover`}
          />
        ) : (
          <EventDisplayBanner layout={layout} label={s("noBanner")} />
        )}
        <div className="participant-content-bottom">
          <section className="participant-information participant-card">
            <h1>{draft.eventName || s("unnamed")}</h1>
            {branding.organizer || logo || branding.channels?.length ? (
              <>
                <div className="participant-section-heading">
                  <strong>{t("hostedBy")}</strong>
                  <span>{t("hostedBySubtitle")}</span>
                </div>
                <div className="participant-divider" />
                <div className="participant-organizer-row flex-wrap">
                  <div className="participant-organizer">
                    {logo && (
                      <Image
                        src={logo.url}
                        alt={branding.organizer || logo.name}
                        width={128}
                        height={48}
                        unoptimized
                        className={
                          branding.identity === "wordmark"
                            ? "h-12 w-32 object-contain"
                            : "size-8 object-contain"
                        }
                      />
                    )}
                    {branding.identity !== "wordmark" && (
                      <div>
                        <strong>{branding.organizer}</strong>
                        {branding.tagline && <p>{branding.tagline}</p>}
                      </div>
                    )}
                  </div>
                  {branding.channels?.map((channel, i) => (
                    <span key={i} className="participant-social">
                      {channel.platform} · {new URL(channel.url).hostname}
                    </span>
                  ))}
                </div>
              </>
            ) : null}
            <div className="participant-divider" />
            <div className="participant-metadata">
              <div className="participant-meta-item">
                <CalendarDaysIcon className="size-8 shrink-0" />
                <div>
                  <strong>{date(draft.startsAt)}</strong>
                  <span>{date(draft.endsAt)}</span>
                </div>
              </div>
              <div className="participant-meta-item">
                <MapPinIcon className="size-8 shrink-0" />
                <div>
                  <strong>{draft.locationName}</strong>
                  <span>{draft.locationDetail}</span>
                </div>
              </div>
            </div>
            {draft.description && (
              <div className="participant-about">
                <div className="participant-section-heading">
                  <strong>{t("about")}</strong>
                  <span>{t("aboutSubtitle")}</span>
                </div>
                <div className="participant-divider" />
                <p>{draft.description}</p>
              </div>
            )}
          </section>
          {forms.length > 0 && (
            <section
              className={`participant-qr participant-card ${layout === "landscape" ? "participant-qr--vertical" : ""}`}
            >
              {forms.map((kind) => (
                <div className="participant-qr-item" key={kind}>
                  <h2>{s(kind)}</h2>
                  <Image
                    src={`/images/event-preview/${kind}.svg`}
                    alt={s(kind)}
                    width={180}
                    height={180}
                  />
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </article>
  );
}
