"use client";

import SelectField from "@/components/form/SelectField";
import Input from "@/components/form/input/InputField";
import { activityActions } from "@/types/activity";
import type {
  ActivityData,
  ActivityFilters as FilterValues,
  ActivityScope,
} from "@/types/activity";
import { useLocale, useTranslations } from "next-intl";

interface ActivityFiltersProps {
  scope: ActivityScope;
  filters: FilterValues;
  data: ActivityData;
  months: string[];
  onChange: <Key extends keyof FilterValues>(
    key: Key,
    value: FilterValues[Key],
  ) => void;
  onReset: () => void;
}

export default function ActivityFilters({
  scope,
  filters,
  data,
  months,
  onChange,
  onReset,
}: ActivityFiltersProps) {
  const t = useTranslations("userActivity");
  const locale = useLocale();
  const monthFormat = new Intl.DateTimeFormat(locale, {
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  });
  const platform = scope === "platform";

  return (
    <div
      className={`grid grid-cols-2 gap-2.5 rounded-xl border border-event-border bg-white px-3.5 py-2 sm:grid-cols-3 dark:border-gray-700 dark:bg-gray-900 [&_input]:h-10 [&_input]:border-event-border [&_input]:px-3 [&_input]:text-preview-control [&_input]:placeholder:text-gray-500 dark:[&_input]:border-gray-700 dark:[&_input]:placeholder:text-gray-400 [&_select]:h-10 [&_select]:border-event-border [&_select]:ps-3 [&_select]:pe-8 [&_select]:text-preview-control dark:[&_select]:border-gray-700 [&_select+span]:w-8 [&_select+span_svg]:size-3 ${
        platform
          ? "lg:grid-cols-[minmax(0,2fr)_minmax(0,1.85fr)_minmax(0,1.05fr)_minmax(0,1.14fr)_auto]"
          : "lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)]"
      }`}
    >
      <div className="col-span-2 sm:col-span-1">
        <Input
          type="search"
          aria-label={t("filters.searchLabel")}
          placeholder={t(
            platform ? "filters.platformSearch" : "filters.eventSearch",
          )}
          value={filters.search}
          onChange={(event) => onChange("search", event.target.value)}
        />
      </div>
      {platform && (
        <div className="[&_select]:bg-event-tile [&_select]:font-semibold [&_select]:text-event-sidebar dark:[&_select]:bg-gray-800 dark:[&_select]:text-gray-100">
          <SelectField
            aria-label={t("columns.event")}
            value={filters.eventId}
            onChange={(event) => onChange("eventId", event.target.value)}
          >
            <option value="">{t("filters.allEvents")}</option>
            {data.events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </SelectField>
        </div>
      )}
      <SelectField
        aria-label={t("columns.action")}
        value={filters.action}
        onChange={(event) => {
          const action = activityActions.find(
            (item) => item === event.target.value,
          );
          onChange("action", action ?? "");
        }}
      >
        <option value="">{t("filters.allActions")}</option>
        {activityActions.map((action) => (
          <option key={action} value={action}>
            {t(`actions.${action}`)}
          </option>
        ))}
      </SelectField>
      <SelectField
        aria-label={t("filters.monthLabel")}
        value={filters.month}
        onChange={(event) => onChange("month", event.target.value)}
      >
        <option value="">{t("filters.allMonths")}</option>
        {months.map((month) => (
          <option key={month} value={month}>
            {monthFormat.format(new Date(`${month}-01T00:00:00Z`))}
          </option>
        ))}
      </SelectField>
      {platform ? (
        <button
          type="button"
          onClick={onReset}
          className="min-h-10 rounded-lg border border-event-border px-3 text-preview-control text-participant-muted hover:bg-event-tile focus-visible:outline-2 focus-visible:outline-event-action dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          {t("filters.reset")}
        </button>
      ) : (
        <SelectField
          aria-label={t("columns.actor")}
          value={filters.actorId}
          onChange={(event) => onChange("actorId", event.target.value)}
        >
          <option value="">{t("filters.allActors")}</option>
          {data.actors.map((actor) => (
            <option key={actor.id} value={actor.id}>
              {locale === "th" ? (actor.nameTh ?? actor.name) : actor.name}
            </option>
          ))}
        </SelectField>
      )}
    </div>
  );
}
