"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import EventSetupBoundary, {
  type EventSetupPageProps,
} from "@/components/event/setup/EventSetupBoundary";
import Button from "@/components/ui/button/Button";
import { api } from "@/core/api";
import { loadEventPublication } from "@/core/event/publication";
import useEventDisplayDate from "@/hooks/useEventDisplayDate";
import { Link } from "@/i18n/navigation";
import type { EventShareResponse } from "@/types/event/public-event";
import { showToast } from "@/utils/alert";
import PublicationIcon from "./PublicationIcon";
import PublishedEventSummary, {
  PublicationHeading,
} from "./PublishedEventSummary";

type FormShareKind = "registration" | "survey";

interface ShareFieldProps {
  field: RefObject<HTMLInputElement | null>;
  label: string;
  url: string;
}

function ShareField({ field, label, url }: ShareFieldProps) {
  return (
    <div className="published-qr__field">
      <PublicationIcon name="link" />
      <input ref={field} aria-label={label} value={url} readOnly dir="ltr" />
    </div>
  );
}

function CopyLinkButton({
  field,
  label,
  url,
  primary = false,
}: ShareFieldProps & { primary?: boolean }) {
  const t = useTranslations("eventPublishedView");
  const copyUrl = async () => {
    try {
      await globalThis.navigator.clipboard.writeText(url);
    } catch {
      const input = field.current;
      input?.focus();
      input?.select();
      showToast({ title: t("copyError"), variant: "error" });
      return;
    }
    showToast({ title: t("copySuccess") });
  };
  return (
    <button
      type="button"
      className={primary ? "published-qr__primary" : undefined}
      onClick={copyUrl}
    >
      <PublicationIcon name="copy" />
      {label}
    </button>
  );
}

function EventShareCard({ url }: { url: string }) {
  const t = useTranslations("eventSetup");
  const labels = useTranslations("eventPublishedView");
  const field = useRef<HTMLInputElement>(null);
  return (
    <section className="published-qr__card published-qr__card--event">
      <div className="published-qr__details">
        <h2>{labels("eventLink")}</h2>
        <p>{labels("shareEventHint")}</p>
        <ShareField field={field} label={labels("eventLink")} url={url} />
      </div>
      <div className="published-qr__buttons">
        <CopyLinkButton field={field} label={t("copyUrl")} url={url} primary />
        <a href={url} target="_blank" rel="noopener noreferrer">
          <PublicationIcon name="external" />
          {t("openEvent")}
        </a>
      </div>
    </section>
  );
}

function FormShareCard({
  kind,
  url,
  schedule,
  eventEndsAt,
}: {
  kind: FormShareKind;
  url: string;
  schedule: EventShareResponse["windows"][FormShareKind];
  eventEndsAt: string | null;
}) {
  const t = useTranslations("eventSetup");
  const labels = useTranslations("eventPublishedView");
  const design = useTranslations("eventSetupDesign");
  const date = useEventDisplayDate();
  const field = useRef<HTMLInputElement>(null);
  const [previewError, setPreviewError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const opensAt = schedule?.opensAt ?? null;
  const closesAt = schedule?.closesAt ?? null;
  const postSurvey =
    kind === "survey" &&
    closesAt &&
    eventEndsAt &&
    Date.parse(closesAt) > Date.parse(eventEndsAt);
  const qrPath = `/api/event/share-links/qr?kind=${kind}`;
  const downloadQr = async () => {
    setDownloading(true);
    try {
      const response = await fetch(`${qrPath}&download=1`);
      const contentType = response.headers.get("content-type")?.split(";")[0];
      if (!response.ok || contentType !== "image/png") {
        showToast({ title: labels("qrDownloadError"), variant: "error" });
        return;
      }

      const download = globalThis.document.createElement("a");
      const objectUrl = URL.createObjectURL(await response.blob());
      download.href = objectUrl;
      download.download = `${kind}-qr.png`;
      globalThis.document.body.append(download);
      try {
        download.click();
      } finally {
        download.remove();
        globalThis.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      }
    } catch {
      showToast({ title: labels("qrDownloadError"), variant: "error" });
    } finally {
      setDownloading(false);
    }
  };
  return (
    <section className="published-qr__card published-qr__card--form">
      <header className="published-qr__form-heading">
        <span>
          <PublicationIcon name="qr" size={20} />
        </span>
        <div>
          <h2>{labels(kind)}</h2>
          {(opensAt || closesAt) && (
            <p>
              {date(opensAt, false)} – {date(closesAt, false)}
              {postSurvey && ` · ${design("postSurvey")}`}
            </p>
          )}
        </div>
      </header>
      <div className="published-qr__art">
        {previewError ? (
          <p role="alert">{labels("qrPreviewError")}</p>
        ) : (
          <Image
            src={qrPath}
            alt={labels("qrPreviewAlt", { form: labels(kind) })}
            width={164}
            height={164}
            unoptimized
            onError={() => setPreviewError(true)}
          />
        )}
      </div>
      <ShareField field={field} label={labels(kind)} url={url} />
      <div className="published-qr__buttons">
        <button type="button" onClick={downloadQr} disabled={downloading}>
          <PublicationIcon name="download" />
          {t("downloadQr")}
        </button>
        <CopyLinkButton
          field={field}
          label={labels("copyUrl")}
          url={url}
          primary
        />
      </div>
    </section>
  );
}

function ShareUnavailable() {
  const t = useTranslations("eventPublishedView");
  return (
    <p role="status" className="published-qr__card">
      {t("linksUnavailable")}
    </p>
  );
}

function ShareLinksSection() {
  const t = useTranslations("eventPublishedView");
  const common = useTranslations("eventHome");
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    attempt: number;
    data: EventShareResponse | null;
    failed: boolean;
  }>();

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    api
      .get<EventShareResponse | null>("/event/share-links", signal)
      .then((response) => {
        if (!signal.aborted) {
          setResult({ attempt, data: response, failed: false });
        }
      })
      .catch(() => {
        if (!signal.aborted) {
          setResult({ attempt, data: null, failed: true });
        }
      });
    return () => controller.abort();
  }, [attempt]);

  if (result?.attempt !== attempt) {
    return (
      <p role="status" aria-busy="true" className="published-qr__card">
        {common("loading")}
      </p>
    );
  }
  if (result.failed) {
    return (
      <div className="published-qr__card">
        <p role="alert">{t("linksLoadError")}</p>
        <div>
          <Button
            size="sm"
            onClick={() => setAttempt((previous) => previous + 1)}
          >
            {common("retry")}
          </Button>
        </div>
      </div>
    );
  }

  if (!result.data) return <ShareUnavailable />;
  const { links, windows, eventEndsAt } = result.data;
  return (
    <>
      <EventShareCard url={links.event} />
      {(links.registration || links.survey) && (
        <div className="published-event__pair">
          {links.registration && (
            <FormShareCard
              key={links.registration}
              kind="registration"
              url={links.registration}
              schedule={windows.registration}
              eventEndsAt={eventEndsAt}
            />
          )}
          {links.survey && (
            <FormShareCard
              key={links.survey}
              kind="survey"
              url={links.survey}
              schedule={windows.survey}
              eventEndsAt={eventEndsAt}
            />
          )}
        </div>
      )}
    </>
  );
}

function PublishedQr({ workspace, userId, locale }: EventSetupPageProps) {
  const t = useTranslations("eventSetup");
  const local = workspace.localPublishedAt
    ? loadEventPublication(
        userId,
        workspace.eventId,
        locale,
        !!workspace.content,
      )
    : null;
  if (
    !workspace.setup?.publication &&
    !local &&
    workspace.eventStatus !== "open" &&
    workspace.eventStatus !== "closed"
  )
    return (
      <Link href="/event" className="event-option">
        {t("backWorkspace")}
      </Link>
    );
  return (
    <article className="published-event published-event--qr">
      <PublicationHeading
        title={t("qrTitle")}
        closed={workspace.eventStatus === "closed" && !local}
      />
      <PublishedEventSummary
        draft={workspace}
        branding={workspace.setup?.branding[locale] ?? workspace.setup?.publication?.branding ?? local?.branding}
        bannerUrl={workspace.bannerUrl}
      />
      {workspace.userRole === "event_owner" ? (
        <ShareLinksSection
          key={`${workspace.eventId}:${workspace.eventStatus}`}
        />
      ) : (
        <ShareUnavailable />
      )}
    </article>
  );
}

export default function PublishedQrPanel() {
  return <EventSetupBoundary component={PublishedQr} />;
}
