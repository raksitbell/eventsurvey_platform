"use client";

import { eventWorkspaceDisplayStatus } from "@/core/event/workspace";
import { Link } from "@/i18n/navigation";
import type { EventWorkspace } from "@/types/event/workspace";
import { useFormatter, useTranslations } from "next-intl";
import WorkspaceIcon from "./WorkspaceIcon";
import "./workspace-details.css";

interface EventWorkspaceDetailsProps {
  workspace: EventWorkspace;
}

export default function EventWorkspaceDetails({
  workspace,
}: EventWorkspaceDetailsProps) {
  const t = useTranslations("eventOverview");
  const home = useTranslations("eventHome");
  const setup = useTranslations("eventSetup");
  const formatter = useFormatter();
  const published = Boolean(workspace.setup?.publication || workspace.localPublishedAt);
  const status = eventWorkspaceDisplayStatus(workspace);
  const schedule = [workspace.startsAt, workspace.endsAt]
    .filter((date): date is string => Boolean(date))
    .map((date) =>
      formatter.dateTime(new Date(date), {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Bangkok",
      }),
    )
    .join(" – ");
  const rows = [
    {
      icon: "icon-outline-calendar",
      label: setup("dateTime"),
      value: schedule || t("noSchedule"),
    },
    {
      icon: "icon-outline-location-marker",
      label: t("venue"),
      value: workspace.locationName || home("locationUnspecified"),
    },
    {
      icon: "icon-outline-globe",
      label: setup("access"),
      value: workspace.isPrivate ? home("details.private") : t("publicDefault"),
    },
  ] as const;
  const forms = [
    {
      icon: "icon-outline-clipboard",
      label: t("registration"),
      enabled: workspace.hasRegistration,
    },
    {
      icon: "icon-outline-clipboard-list",
      label: t("survey"),
      enabled: workspace.hasSurvey,
    },
  ] as const;

  return (
    <section
      className="workspace-details"
      aria-labelledby="workspace-event-heading"
    >
      <header className="workspace-details__heading">
        <h2 id="workspace-event-heading">{setup("yourEvent")}</h2>
        <span className="workspace-details__status">
          <span aria-hidden="true">●</span>
          {published
            ? setup("published")
            : status === "draft"
              ? t("draft")
              : home(`eventStatus.${status}`)}
        </span>
      </header>
      <Link href="/event/details" className="workspace-details__excerpt">
        <p className="workspace-details__name-label">{home("details.name")}</p>
        <h3
          className={
            workspace.eventName
              ? "workspace-details__name"
              : "workspace-details__name is-empty"
          }
        >
          {workspace.eventName || setup("unnamed")}
        </h3>
        <div className="workspace-details__excerpt-row">
          <div className="min-w-0">
            <p className="workspace-details__description-label">
              {t("descriptionLabel")}
            </p>
            <p className="workspace-details__description">
              {workspace.description || t("descriptionPlaceholder")}
            </p>
          </div>
          <WorkspaceIcon
            name="icon-outline-chevron-right-open-user-management"
            size={18}
            directional
          />
        </div>
      </Link>
      {rows.map(({ icon, label, value }) => (
        <dl className="workspace-details__row" key={icon}>
          <dt className="workspace-details__label">
            <WorkspaceIcon name={icon} size={20} />
            <span>{label}</span>
          </dt>
          <dd>{value}</dd>
        </dl>
      ))}
      <h2
        className="workspace-details__forms-label"
        id="workspace-forms-heading"
      >
        {home("eventForms")}
      </h2>
      <dl
        className="workspace-details__forms"
        aria-labelledby="workspace-forms-heading"
      >
        {forms.map(({ icon, label, enabled }) => (
          <div className="workspace-details__form" key={icon}>
            <dt className="workspace-details__label">
              <WorkspaceIcon name={icon} size={20} />
              <span>{label}</span>
            </dt>
            <dd>{setup(enabled ? "enabled" : "disabled")}</dd>
          </div>
        ))}
      </dl>
      <Link
        className="workspace-details__action"
        href={published ? "/event/qr" : "/event/details"}
      >
        <span>{setup(published ? "qrTitle" : "start")}</span>
        <WorkspaceIcon name="icon-outline-arrow-right" size={18} directional />
      </Link>
    </section>
  );
}
