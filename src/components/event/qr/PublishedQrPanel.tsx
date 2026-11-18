"use client";
import EventSetupBoundary, {
  type EventSetupPageProps,
} from "@/components/event/setup/EventSetupBoundary";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { loadPublication, publicationKey } from "@/core/event/publication";
import { surveyClosingTime } from "@/core/event/schedule";
import type { EventDraft } from "@/types/event/setup";
import PublicationIcon from "./PublicationIcon";
import PublishedEventSummary, {
  PublicationHeading,
} from "./PublishedEventSummary";
import useEventDisplayDate from "@/hooks/useEventDisplayDate";

type ShareKind = "event" | "registration" | "survey";

function ShareActions({ eventPage }: { eventPage: boolean }) {
  const t = useTranslations("eventSetup");
  const p = useTranslations("eventPublishedView");
  const copy = (
    <button type="button" disabled className="published-qr__primary">
      <PublicationIcon name="copy" />
      {eventPage ? t("copyUrl") : p("copyUrl")}
    </button>
  );
  const download = (
    <button type="button" disabled>
      <PublicationIcon name="download" />
      {t("downloadQr")}
    </button>
  );
  return (
    <div className="published-qr__buttons">
      {eventPage ? copy : download}
      {eventPage ? download : copy}
      {eventPage && (
        <button type="button" disabled>
          <PublicationIcon name="external" />
          {t("openEvent")}
        </button>
      )}
    </div>
  );
}
function ShareCard({ kind, draft }: { kind: ShareKind; draft: EventDraft }) {
  const t = useTranslations("eventSetup"),
    p = useTranslations("eventPublishedView");
  const date = useEventDisplayDate();
  const design = useTranslations("eventSetupDesign");
  const eventPage = kind === "event";
  const range = kind === "survey" ? surveyClosingTime(draft) : draft.endsAt;
  const art = (
    <div className="published-qr__art">
      <Image
        src={`/images/event-publication/${kind}-qr-sample.svg`}
        alt={p("sampleQr")}
        width={eventPage ? 132 : 164}
        height={eventPage ? 132 : 164}
      />
    </div>
  );
  const field = (
    <div className="published-qr__field">
      <PublicationIcon name="link" />
      <input aria-label={t("copyUrl")} value="" readOnly disabled />
    </div>
  );
  return (
    <section
      className={`published-qr__card ${eventPage ? "published-qr__card--event" : "published-qr__card--form"}`}
    >
      {eventPage ? (
        <>
          {art}
          <div className="published-qr__details">
            <h2>{t("eventQr")}</h2>
            <p>{p("shareEventHint")}</p>
            {field}
          </div>
        </>
      ) : (
        <>
          <header className="published-qr__form-heading">
            <span>
              <PublicationIcon name="qr" size={20} />
            </span>
            <div>
              <h2>{p(kind)}</h2>
              <p>
                {date(draft.startsAt, false)} – {date(range, false)}
                {kind === "survey" &&
                range &&
                draft.endsAt &&
                new Date(range) > new Date(draft.endsAt)
                  ? " · " + design("postSurvey")
                  : ""}
              </p>
            </div>
          </header>
          {art}
          {field}
        </>
      )}
      <ShareActions eventPage={eventPage} />
    </section>
  );
}
function PublishedQr({ workspace, userId, locale }: EventSetupPageProps) {
  const t = useTranslations("eventSetup");
  const local = workspace.localPublishedAt
    ? loadPublication(publicationKey(userId, workspace.eventId, locale))
    : null;
  if (
    !local &&
    workspace.eventStatus !== "open" &&
    workspace.eventStatus !== "closed"
  )
    return (
      <Link href="/event" className="event-option">
        {t("backWorkspace")}
      </Link>
    );
  const data = local?.draft ?? workspace;
  return (
    <article className="published-event published-event--qr">
      <PublicationHeading
        title={t("qrTitle")}
        closed={workspace.eventStatus === "closed" && !local}
      />
      <PublishedEventSummary
        draft={data}
        branding={local?.branding}
        bannerUrl={workspace.bannerUrl}
      />
      <ShareCard kind="event" draft={data} />
      <div className="published-event__pair">
        {data.hasRegistration && <ShareCard kind="registration" draft={data} />}
        {data.hasSurvey && <ShareCard kind="survey" draft={data} />}
      </div>
    </article>
  );
}
export default function PublishedQrPanel() {
  return <EventSetupBoundary component={PublishedQr} />;
}
