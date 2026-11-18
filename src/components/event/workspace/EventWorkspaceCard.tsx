"use client";
import EventWorkspaceTeam from "./EventWorkspaceTeam";
import { eventWorkspaceDisplayStatus } from "@/core/event/workspace";
import { Link } from "@/i18n/navigation";
import type { EventWorkspace } from "@/types/event/workspace";
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import Image from "next/image";

interface Props {
  workspace: EventWorkspace;
  banner?: string | null;
}
export default function EventWorkspaceCard({ workspace, banner }: Props) {
  const t = useTranslations("eventHome"),
    s = useTranslations("eventSetup"),
    fmt = useFormatter();
  const [failed, setFailed] = useState("");
  const src = banner ?? workspace.bannerUrl;
  const date = (v: string | null) =>
    v
      ? fmt.dateTime(new Date(v), {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Asia/Bangkok",
        })
      : t("schedulePending");
  const published = !!workspace.localPublishedAt;
  const href = published ? "/event/qr" : "/event/details";
  return (
    <article className="event-sheet grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3.15fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="event-section flex aspect-3/4 flex-1 flex-col items-center justify-center gap-5 overflow-hidden text-event-action dark:text-brand-300">
          {src && src !== failed ? (
            <Image
              unoptimized
              src={src}
              width={450}
              height={600}
              alt={t("bannerTitle")}
              className="size-full object-contain"
              onError={() => setFailed(src)}
            />
          ) : (
            <>
              <Image src="/images/event-preview/empty-banner.png" alt="" width={224} height={174} className="max-w-full"/>
              <strong>{s("noBanner")}</strong>
            </>
          )}
        </div>
        <div className="event-section">
          <EventWorkspaceTeam workspace={workspace} />
        </div>
      </div>
      <div className="flex min-w-0 flex-col justify-between gap-4">
        <header className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-bold">{s("yourEvent")}</h1>
          <span className="rounded-full bg-event-tile px-4 py-1 text-sm font-semibold text-event-action dark:bg-gray-800 dark:text-brand-300">
            ●{" "}
            {published
              ? s("published")
              : t("eventStatus." + eventWorkspaceDisplayStatus(workspace))}
          </span>
        </header>
        <Link
          href="/event/details"
          className="space-y-1 rounded-xl border border-event-border p-4 dark:border-gray-700"
        >
          <p className="text-xs">{t("details.name")}</p>
          <h2 className="text-lg font-bold wrap-anywhere">
            {workspace.eventName || s("unnamed")}
          </h2>
          <p className="text-xs">{t("details.descriptionField")}</p>
          <p className="text-sm wrap-anywhere">
            {workspace.description || t("descriptionPending")}
          </p>
        </Link>
        {[
          {
            Icon: CalendarDaysIcon,
            label: s("dateTime"),
            value:
              date(workspace.startsAt) +
              (workspace.endsAt ? " – " + date(workspace.endsAt) : ""),
          },
          {
            Icon: MapPinIcon,
            label: t("details.location"),
            value: workspace.locationName ?? t("locationUnspecified"),
          },
          {
            Icon: GlobeAltIcon,
            label: s("access"),
            value: t(workspace.isPrivate ? "privateEvent" : "publicEvent"),
          },
        ].map(({ Icon, label, value }) => (
          <div
            key={label}
            className="flex items-center gap-2 rounded-xl border border-event-border p-4 text-sm dark:border-gray-700"
          >
            <Icon className="size-5 shrink-0" />
            <strong>{label}</strong>
            <span className="ms-auto text-end wrap-anywhere">{value}</span>
          </div>
        ))}
        <section>
          <h3 className="mb-2 font-semibold">{t("eventForms")}</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              {
                name: "registrationForm",
                enabled: workspace.hasRegistration,
                Icon: ClipboardDocumentListIcon,
              },
              {
                name: "surveyForm",
                enabled: workspace.hasSurvey,
                Icon: DocumentTextIcon,
              },
            ].map(({ name, enabled, Icon }) => (
              <div className="event-section text-sm" key={name}>
                <strong className="flex items-center gap-2">
                  <Icon className="size-4" />
                  {t(name)}
                </strong>
                <p className="mt-2">{s(enabled ? "enabled" : "disabled")}</p>
              </div>
            ))}
          </div>
        </section>
        <Link
          href={href}
          className="flex min-h-12 items-center justify-center gap-3 rounded-lg bg-event-action text-white dark:bg-event-action"
        >
          {s(published ? "qrTitle" : "start")}
          <ArrowRightIcon className="size-5 rtl:rotate-180" />
        </Link>
      </div>
    </article>
  );
}
