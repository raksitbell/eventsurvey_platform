"use client";

import EventWorkspaceTeam from "@/components/event/workspace/EventWorkspaceTeam";
import { eventWorkspaceDisplayStatus } from "@/core/event/workspace";
import { Link } from "@/i18n/navigation";
import type { EventWorkspace } from "@/types/event/workspace";
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  GlobeAltIcon,
  MapPinIcon,
  PhotoIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

interface EventWorkspaceCardProps {
  workspace: EventWorkspace;
}

export default function EventWorkspaceCard({
  workspace,
}: EventWorkspaceCardProps) {
  const t = useTranslations("eventHome");
  const locale = useLocale();
  const [failedBanner, setFailedBanner] = useState<string | null>(null);
  const formatDate = (value: string | null) => {
    if (!value || Number.isNaN(Date.parse(value))) return t("schedulePending");
    return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Bangkok",
    }).format(new Date(value));
  };
  const displayStatus = eventWorkspaceDisplayStatus(workspace);
  const statusStyle =
    displayStatus === "draft"
      ? "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400"
      : displayStatus === "closed"
        ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
        : "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400";

  return (
    <div className="space-y-5">
      <article className="flex flex-col gap-6 rounded-2xl border border-event-border bg-white p-6 lg:flex-row dark:border-gray-800 dark:bg-gray-900">
        <div className="relative flex aspect-4/5 w-full shrink-0 flex-col items-center justify-between overflow-hidden rounded-xl bg-event-banner px-6 py-8 text-white lg:min-h-135 lg:w-2/5 lg:py-12 dark:bg-brand-800">
          {workspace.bannerUrl && failedBanner !== workspace.bannerUrl ? (
            // Uploaded event imagery is dynamic and may come from the mock API host.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={workspace.bannerUrl}
              alt={t("bannerTitle")}
              onError={() => setFailedBanner(workspace.bannerUrl)}
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <>
              <span className="flex size-16 items-center justify-center rounded-2xl bg-event-tile text-event-action dark:bg-brand-900 dark:text-brand-200">
                <PhotoIcon className="size-6" aria-hidden="true" />
              </span>
              <div className="w-full">
                <p className="text-xl font-bold">{t("bannerTitle")}</p>
                <p className="mt-2 text-theme-sm">{t("bannerHint")}</p>
              </div>
              <span className="rounded-full bg-event-tile px-4 py-2 text-theme-sm font-medium text-event-action dark:bg-brand-900 dark:text-brand-200">
                {t("bannerRatio")}
              </span>
            </>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-12">
          <div className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="min-w-0 text-2xl font-semibold break-words text-gray-900 dark:text-white/90">
                {workspace.eventName}
              </h2>
              <span
                className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-theme-xs font-medium ${statusStyle}`}
              >
                <span
                  className="size-2 rounded-full bg-current"
                  aria-hidden="true"
                />
                {t(`eventStatus.${displayStatus}`)}
              </span>
            </div>
            <p className="text-base break-words whitespace-pre-wrap text-gray-500 dark:text-gray-400">
              {workspace.description || t("descriptionPending")}
            </p>
            <div className="space-y-2 rounded-xl bg-event-subtle p-3.5 text-theme-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              <p className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-event-tile text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                  <CalendarDaysIcon className="size-6" aria-hidden="true" />
                </span>
                <span>
                  {formatDate(workspace.startsAt)}
                  {workspace.endsAt ? ` – ${formatDate(workspace.endsAt)}` : ""}
                  <span className="block text-theme-xs text-gray-500 dark:text-gray-400">
                    {t("timezone")}
                  </span>
                </span>
              </p>
              <p className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-event-tile text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                  <MapPinIcon className="size-6" aria-hidden="true" />
                </span>
                <span className="min-w-0 break-words">
                  {t("locationSummary", {
                    location:
                      workspace.locationName?.trim() ||
                      t("locationUnspecified"),
                  })}
                </span>
              </p>
              <p className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-event-tile text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                  <GlobeAltIcon className="size-6" aria-hidden="true" />
                </span>
                {t(workspace.isPrivate ? "privateEvent" : "publicEvent")}
              </p>
            </div>
            <section aria-label={t("eventForms")} className="space-y-2">
              <h3 className="text-theme-sm font-semibold text-gray-800 dark:text-gray-200">
                {t("eventForms")}
              </h3>
              {(
                [
                  {
                    key: "registrationForm",
                    enabled: workspace.hasRegistration,
                    Icon: ClipboardDocumentListIcon,
                  },
                  {
                    key: "surveyForm",
                    enabled: workspace.hasSurvey,
                    Icon: DocumentTextIcon,
                  },
                ] as const
              ).map(({ key, enabled, Icon }) => (
                <div
                  key={key}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-theme-sm ${enabled ? "border-event-border bg-white text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200" : "border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-500"}`}
                >
                  <span
                    className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${enabled ? "bg-event-tile dark:bg-gray-700" : "bg-gray-200 dark:bg-gray-700"}`}
                  >
                    <Icon className="size-6" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1 font-medium">{t(key)}</span>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-theme-sm font-medium ${enabled ? "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400" : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"}`}
                  >
                    {t(enabled ? "formAvailable" : "formUnavailable")}
                  </span>
                </div>
              ))}
            </section>
          </div>
          <div className="space-y-4 border-t border-event-border pt-4 dark:border-gray-800">
            <EventWorkspaceTeam workspace={workspace} />
            <div className="flex justify-end">
              <Link
                href="/event/details"
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-event-action px-5 py-3.5 text-sm font-medium text-white shadow-theme-xs transition hover:bg-event-action/90 sm:w-72 dark:bg-event-action dark:hover:bg-event-action/90"
              >
                {t("openOverview")}
                <ArrowRightIcon
                  className="size-4 rtl:rotate-180"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
