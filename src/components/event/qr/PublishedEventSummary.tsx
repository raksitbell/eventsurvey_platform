"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import type { EventBranding } from "@/types/event/branding";
import type { EventDraft } from "@/types/event/setup";
import WorkspaceIcon from "@/components/event/workspace/WorkspaceIcon";
import PublicationIcon from "./PublicationIcon";
import useEventDisplayDate from "@/hooks/useEventDisplayDate";
import "./published-event.css";

interface PublishedDataProps {
  draft: EventDraft;
  branding?: EventBranding;
  bannerUrl: string | null;
}

export function PublicationHeading({
  title,
  subtitle,
  closed = false,
}: {
  title: string;
  subtitle?: string;
  closed?: boolean;
}) {
  const t = useTranslations("eventSetup");
  return (
    <header className="published-event__heading">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <span className="published-event__status">
        <PublicationIcon name="status" size={14} />
        {t(closed ? "closed" : "published")}
      </span>
    </header>
  );
}

export default function PublishedEventSummary({
  draft,
  branding,
  bannerUrl,
}: PublishedDataProps) {
  const t = useTranslations("eventPublishedView");
  const setup = useTranslations("eventSetup");
  const date = useEventDisplayDate();
  const src = branding?.banner?.url ?? bannerUrl;
  return (
    <div className="published-event__summary">
      <div className="published-event__banner">
        {src ? (
          <Image alt="" width={78} height={104} unoptimized src={src} />
        ) : (
          <Image
            alt=""
            unoptimized
            width={60}
            height={46}
            src="/images/event-preview/empty-banner.png"
          />
        )}
      </div>
      <div className="published-event__identity">
        <h2>{draft.eventName || setup("unnamed")}</h2>
        {draft.alternateContent?.eventName && (
          <p>{draft.alternateContent.eventName}</p>
        )}
        <div className="published-event__label">
          <WorkspaceIcon name="icon-outline-user-group" size={16} />
          <span>{t("hosted")}</span>
          <strong>{branding?.organizer || "—"}</strong>
        </div>
      </div>
      <div className="published-event__dates">
        <div className="published-event__label">
          <PublicationIcon name="calendar" />
          <span>{t("dates")}</span>
        </div>
        <p>{t("starts", { date: date(draft.startsAt) })}</p>
        <p>{t("ends", { date: date(draft.endsAt) })}</p>
      </div>
    </div>
  );
}
