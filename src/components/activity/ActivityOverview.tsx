"use client";

import type { ActivityEvent, ActivityScope } from "@/types/activity";
import { PhotoIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import type { getActivitySummary } from "@/services/activity/mock";

interface ActivityOverviewProps {
  scope: ActivityScope;
  event?: ActivityEvent;
  summary: ReturnType<typeof getActivitySummary>;
}

function EventHero({ event }: { event: ActivityEvent }) {
  const t = useTranslations("userActivity");
  const locale = useLocale();
  const [failedUrl, setFailedUrl] = useState("");
  return (
    <div className="flex min-h-[100px] items-center gap-5 rounded-xl bg-preview-page px-5 py-2 dark:bg-gray-800">
      <div className="flex h-[84px] w-[68px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-event-tile text-event-sidebar dark:bg-gray-700 dark:text-gray-300">
        {event.posterUrl && event.posterUrl !== failedUrl ? (
          <Image
            src={event.posterUrl}
            unoptimized={!event.posterUrl.startsWith("/images/")}
            width={68}
            height={84}
            className="size-full object-cover"
            alt=""
            onError={() => setFailedUrl(event.posterUrl ?? "")}
          />
        ) : (
          <PhotoIcon className="size-6" aria-hidden="true" />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold wrap-break-word text-participant-text dark:text-white">
          {locale === "th" ? (event.heroNameTh ?? event.name) : event.name}
        </p>
        {event.organizer && (
          <p className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-participant-muted dark:text-gray-300">
            <UserGroupIcon
              className="size-4 text-participant-text dark:text-gray-300"
              aria-hidden="true"
            />
            {t("organizedBy")}
            <strong className="ms-1 text-sm font-semibold text-participant-text dark:text-white">
              {event.organizer}
            </strong>
          </p>
        )}
      </div>
    </div>
  );
}

export default function ActivityOverview({
  scope,
  event,
  summary,
}: ActivityOverviewProps) {
  const t = useTranslations("userActivity");
  const format = useFormatter();
  const platform = scope === "platform";
  const metrics = platform
    ? ([
        {
          key: "total",
          value: summary.total,
          note: event ? "selectedTotal" : "platformTotal",
        },
        {
          key: "eventCount",
          value: summary.eventCount,
          note: event ? "selectedEvents" : "platformEvents",
        },
        {
          key: "actorCount",
          value: summary.actorCount,
          note: event ? "selectedActors" : "platformActors",
        },
        {
          key: "edit",
          value: summary.edit,
          note: event ? "selectedEdits" : "platformEdits",
        },
      ] as const)
    : ([
        { key: "total", value: summary.total, note: "eventTotal" },
        { key: "actorCount", value: summary.actorCount, note: "eventActors" },
        { key: "edit", value: summary.edit, note: "eventEdits" },
        { key: "delete", value: summary.delete, note: "eventDeletes" },
      ] as const);

  return (
    <header className="space-y-3 sm:space-y-4">
      <div>
        <p className="mb-2 text-preview-compact font-semibold text-event-sidebar/80 uppercase sm:mb-3 dark:text-gray-300">
          {t(platform ? "platformBreadcrumb" : "eventBreadcrumb")} /{" "}
          {t("title")}
        </p>
        <div className="flex flex-wrap items-start justify-between gap-2.5">
          <h1 className="text-3xl leading-tight font-bold text-participant-text dark:text-white">
            {t(
              platform
                ? event
                  ? "platformEventTitle"
                  : "platformTitle"
                : "eventTitle",
            )}
          </h1>
          {platform && (
            <span className="flex min-h-10 w-fit items-center rounded-xl bg-event-tile px-4 text-xs font-semibold text-event-sidebar sm:min-w-60 dark:bg-gray-800 dark:text-gray-200">
              {t(event ? "platformEventBadge" : "platformBadge")}
            </span>
          )}
        </div>
        <p className="mt-2.5 text-preview-control text-participant-muted dark:text-gray-300">
          {t(platform ? "platformDescription" : "eventDescription")}
        </p>
      </div>
      {event && <EventHero key={event.id} event={event} />}
      <dl className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4 xl:gap-[18px]">
        {metrics.map(({ key, value, note }) => (
          <div
            key={key}
            className="flex min-h-24 flex-col justify-center gap-0.5 rounded-xl border border-event-border bg-white px-4 py-2.5 dark:border-gray-700 dark:bg-gray-900"
          >
            <dt className="text-xs font-medium text-participant-muted dark:text-gray-300">
              {t(`metrics.${key}`)}
            </dt>
            <dd className="text-title-sm leading-tight font-bold text-event-sidebar dark:text-gray-100">
              {format.number(value)}
            </dd>
            <dd className="text-preview-compact text-participant-muted dark:text-gray-400">
              {t(`metricNotes.${note}`)}
            </dd>
          </div>
        ))}
      </dl>
    </header>
  );
}
