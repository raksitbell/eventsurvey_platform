"use client";

import EventSetupBoundary, {
  type EventSetupPageProps,
} from "@/components/event/setup/EventSetupBoundary";
import { canEditLocalEventSetup } from "@/core/event/draft";
import { toBangkokInput } from "@/core/i18n/bangkok-datetime";
import {
  filterActivity,
  getActivitySummary,
  getMockActivityData,
} from "@/services/activity/mock";
import type {
  ActivityActor,
  ActivityData,
  ActivityFilters as FilterValues,
  ActivityRelatedPage,
  ActivityScope,
} from "@/types/activity";
import type { EventWorkspace } from "@/types/event/workspace";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import ActivityFilters from "./ActivityFilters";
import ActivityOverview from "./ActivityOverview";
import ActivityProfileDialog from "./ActivityProfileDialog";
import ActivityTable from "./ActivityTable";

const pageSize = 5;
const platformData = getMockActivityData();

function ActivityView({
  scope,
  data,
  workspace,
}: {
  scope: ActivityScope;
  data: ActivityData;
  workspace?: EventWorkspace;
}) {
  const t = useTranslations("userActivity");
  const locale = useLocale();
  const platform = scope === "platform";
  const months = useMemo(
    () =>
      Array.from(
        new Set(
          data.records.map(({ occurredAt }) =>
            toBangkokInput(occurredAt).slice(0, 7),
          ),
        ),
      )
        .sort()
        .reverse(),
    [data],
  );
  const initialFilters: FilterValues = {
    search: "",
    eventId: "",
    action: "",
    month: "",
    actorId: "",
  };
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [actor, setActor] = useState<ActivityActor>();
  const activeEvent = workspace
    ? data.events[0]
    : data.events.find((event) => event.id === filters.eventId);
  const scopedRecords = activeEvent
    ? data.records.filter((record) => record.eventId === activeEvent.id)
    : data.records;
  const filteredRecords = filterActivity(data, filters, locale, (key) =>
    t(key),
  );
  const rows = filteredRecords.slice((page - 1) * pageSize, page * pageSize);

  function setFilter<Key extends keyof FilterValues>(
    key: Key,
    value: FilterValues[Key],
  ) {
    setFilters((previous) => ({ ...previous, [key]: value }));
    setPage(1);
  }

  function relatedHref(relatedPage: ActivityRelatedPage) {
    if (platform) return "/admin/events";
    if (relatedPage === "team") return "/event";
    if (relatedPage === "setup" || relatedPage === "access")
      return "/event/details";
    if (!workspace || !canEditLocalEventSetup(workspace)) return;
    if (
      relatedPage === "registration" &&
      workspace.hasRegistration &&
      workspace.canManageWhitelist
    )
      return "/event/setup/registration";
    if (
      relatedPage === "survey" &&
      workspace.hasSurvey &&
      workspace.canManageSurveyForm
    )
      return "/event/setup/survey";
  }

  return (
    <section className="min-w-0 space-y-3">
      <ActivityOverview
        scope={scope}
        event={activeEvent}
        summary={getActivitySummary(scopedRecords)}
      />
      <ActivityFilters
        scope={scope}
        data={data}
        months={months}
        filters={filters}
        onChange={setFilter}
        onReset={() => {
          setFilters(initialFilters);
          setPage(1);
        }}
      />
      <section aria-labelledby="activity-table-heading" className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2
            id="activity-table-heading"
            className="text-lg font-semibold text-participant-text dark:text-white"
          >
            {t(
              platform
                ? activeEvent
                  ? "table.selected"
                  : "table.platform"
                : "table.event",
            )}
          </h2>
          <p className="text-xs text-participant-muted dark:text-gray-400">
            {platform
              ? activeEvent
                ? t("table.selectedHint", { event: activeEvent.name })
                : t("table.platformHint")
              : t("table.eventHint", { count: rows.length })}
          </p>
        </div>
        <ActivityTable
          scope={scope}
          data={data}
          rows={rows}
          total={filteredRecords.length}
          page={page}
          pageSize={pageSize}
          onPage={setPage}
          onEvent={(eventId) => setFilter("eventId", eventId)}
          onProfile={setActor}
          relatedHref={relatedHref}
        />
      </section>
      {actor && (
        <ActivityProfileDialog
          scope={scope}
          actor={actor}
          records={scopedRecords}
          events={activeEvent ? [activeEvent] : data.events}
          onClose={() => setActor(undefined)}
        />
      )}
    </section>
  );
}

function WorkspaceActivity({ workspace }: EventSetupPageProps) {
  const { eventId, eventName, bannerUrl } = workspace;
  const data = useMemo(
    () =>
      getMockActivityData({
        id: eventId,
        name: eventName,
        posterUrl: bannerUrl ?? undefined,
      }),
    [eventId, eventName, bannerUrl],
  );
  return (
    <ActivityView
      key={eventId}
      scope="event"
      data={data}
      workspace={workspace}
    />
  );
}

export default function UserActivityPage({ scope }: { scope: ActivityScope }) {
  return scope === "platform" ? (
    <ActivityView scope="platform" data={platformData} />
  ) : (
    <EventSetupBoundary component={WorkspaceActivity} />
  );
}
