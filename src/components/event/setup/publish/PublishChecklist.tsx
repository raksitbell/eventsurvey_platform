import Image from "next/image";
import { useTranslations } from "next-intl";
import { bannerLayouts } from "@/core/event/banner-layout";
import { toBangkokInput } from "@/core/i18n/bangkok-datetime";
import type { PublishIssue } from "@/core/event/publication";
import type { EventDraft } from "@/types/event/setup";
import type { EventBranding } from "@/types/event/branding";
import PublicationIcon from "@/components/event/qr/PublicationIcon";
import "./publish-view.css";

interface Props {
  draft: EventDraft;
  branding: EventBranding;
  issues: PublishIssue[];
  loading: boolean;
  canEdit: boolean;
  onEdit: () => void;
}

function dateLabel(value: string | null) {
  const bangkok = toBangkokInput(value);
  if (!bangkok) return "—";
  const [date, time] = bangkok.split("T");
  return date.split("-").reverse().join("/") + " · " + time;
}

export default function PublishChecklist({
  draft,
  branding,
  issues,
  loading,
  canEdit,
  onEdit,
}: Props) {
  const setup = useTranslations("eventSetup"),
    details = useTranslations("eventHome.details"),
    publish = useTranslations("eventPublish"),
    labels = useTranslations("eventPublishedView");
  const logo =
    branding.identity === "wordmark" ? branding.wordmark : branding.logo;
  const rows = [
    {
      label: details("name"),
      value: draft.eventName,
      ok: !issues.includes("eventName"),
    },
    {
      label: details("startsAt"),
      value: dateLabel(draft.startsAt),
      ok: !!draft.startsAt,
    },
    {
      label: details("endsAt"),
      value: dateLabel(draft.endsAt),
      ok: !issues.includes("eventSchedule"),
    },
    {
      label: details("location"),
      value: draft.locationName,
      ok: !issues.includes("location"),
    },
    {
      label: setup("bannerRatio"),
      value: bannerLayouts[branding.layout ?? "portrait"].ratio,
      ok: true,
    },
    {
      label: setup("access"),
      value: details(draft.isPrivate ? "private" : "public"),
      ok: !issues.includes("whitelist") && !issues.includes("uniqueField"),
    },
  ];
  return (
    <section className="publish-card publish-checklist">
      <h2>{setup("checklist")}</h2>
      <p className="publish-checklist__hint">{labels("checklistHint")}</p>
      {rows.map(({ label, value, ok }) => (
        <button
          type="button"
          key={label}
          className="publish-checklist__row"
          data-complete={ok}
          disabled={!canEdit}
          onClick={onEdit}
        >
          <span aria-hidden="true" className="publish-checklist__icon">
            {ok ? "✓" : "○"}
          </span>
          <span className="publish-checklist__value">
            <strong>{label} *</strong>
            <small>{value || "—"}</small>
          </span>
          <span className="publish-checklist__badge">
            {ok ? setup("ready") : labels("pending")}
          </span>
        </button>
      ))}
      <div className="publish-checklist__forms">
        {(["registration", "survey"] as const).map((kind) => (
          <button type="button" disabled={!canEdit} key={kind} onClick={onEdit}>
            <strong>{labels(kind)}</strong>
            <span>
              {(
                kind === "registration"
                  ? draft.hasRegistration
                  : draft.hasSurvey
              )
                ? setup("enabled")
                : labels("off")}
            </span>
          </button>
        ))}
      </div>
      <div className="publish-checklist__branding">
        {logo && (
          <Image
            className="publish-checklist__logo"
            src={logo.url}
            width={116}
            height={30}
            alt={logo.name}
            unoptimized
          />
        )}
        <PublicationIcon name="palette" size={18} />
        <div>
          <strong>
            {labels("hosted")} · {branding.organizer || "—"}
          </strong>
          <small>
            {setup(branding.identity ?? "icon")} ·{" "}
            {setup(branding.backgroundMode ?? "solid")}
          </small>
          <small>
            {labels("chrome")} ·{" "}
            {branding.transparentChrome
              ? labels("transparent")
              : [
                  branding.primary,
                  branding.footerColor ?? branding.primary,
                ].join(" / ")}
          </small>
        </div>
      </div>
      {!loading &&
        issues
          .filter(
            (issue) =>
              !["eventName", "eventSchedule", "location"].includes(issue),
          )
          .map((issue) => (
            <p
              key={issue}
              className="text-sm text-error-600 dark:text-error-400"
            >
              {publish("issues." + issue)}
            </p>
          ))}
    </section>
  );
}
