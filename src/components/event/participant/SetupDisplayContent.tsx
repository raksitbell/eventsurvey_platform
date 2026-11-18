import { bannerObjectPosition } from "@/core/event/banner-layout";
import Image from "next/image";
import EventDisplayBanner from "@/components/participant/EventDisplayBanner";
import PublicationIcon from "@/components/event/qr/PublicationIcon";
import type { ParticipantEventData } from "@/types/event/participant";
import { participantColors } from "@/core/event/participant-colors";
import type { CSSProperties } from "react";
import useEventDisplayDate from "@/hooks/useEventDisplayDate";
import { useTranslations } from "next-intl";
import "@/components/participant/event-display.css";
import "./setup-display.css";

export default function SetupDisplayContent({
  draft,
  branding,
  bannerUrl,
  compact,
}: ParticipantEventData & { compact: boolean }) {
  const t = useTranslations("participantDisplay"),
    s = useTranslations("eventSetup");
  const labels = useTranslations("eventPublishedView");
  const date = useEventDisplayDate();
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
            className={`participant-banner participant-banner--${layout} border-none! ${branding.banner?.cropPosition === undefined ? "object-contain" : "object-cover"}`}
            style={{
              objectPosition: bannerObjectPosition(
                branding.banner?.cropPosition,
              ),
            }}
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
                    {!logo && branding.organizer && (
                      <span aria-hidden="true" className="participant-avatar">
                        {Array.from(branding.organizer.trim())[0]}
                      </span>
                    )}
                    {(branding.identity !== "wordmark" || !logo) && (
                      <div>
                        <strong>{branding.organizer}</strong>
                        {branding.tagline && <p>{branding.tagline}</p>}
                      </div>
                    )}
                  </div>
                  <div className="participant-socials">
                    {branding.channels?.map((channel, i) => {
                      const platform = channel.platform.toLowerCase();
                      const icon = platform === "x" ? "twitter" : platform;
                      const url = new URL(channel.url);
                      return (
                        <span key={i} className="participant-social">
                          {["facebook", "twitter", "instagram"].includes(
                            icon,
                          ) ? (
                            <PublicationIcon name={icon} size={24} />
                          ) : (
                            channel.platform
                          )}
                          {url.pathname.split("/").filter(Boolean).pop() ||
                            url.hostname}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : null}
            <div className="participant-divider" />
            <div className="participant-metadata">
              <div className="participant-meta-item">
                <span className="participant-meta-icon">
                  <PublicationIcon name="calendar" size={32} />
                </span>
                <div>
                  <strong>
                    {labels("starts", { date: date(draft.startsAt) })}
                  </strong>
                  <span>{labels("ends", { date: date(draft.endsAt) })}</span>
                </div>
              </div>
              <div className="participant-meta-item">
                <span className="participant-meta-icon">
                  <PublicationIcon name="venue" size={32} />
                </span>
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
          {forms.length ? (
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
          ) : (
            <section
              className={`participant-qr participant-card setup-display__empty-qr ${layout === "landscape" ? "participant-qr--vertical" : ""}`}
            >
              <PublicationIcon name="qr" size={compact ? 59 : 32} />
              {compact ? (
                <p>{labels("qrPending")}</p>
              ) : (
                <>
                  <h2>{labels("qrUnavailable")}</h2>
                  <p>{labels("qrNotice")}</p>
                  <small>
                    {labels("registration")} · {labels("survey")}
                  </small>
                </>
              )}
            </section>
          )}
        </div>
      </div>
    </article>
  );
}
