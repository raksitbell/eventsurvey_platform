"use client";

import EventStatusBadge from "@/components/admin/events/EventStatusBadge";
import DateRangePicker, {
  type DateRangeValue,
} from "@/components/form/DateRangePicker";
import SelectField from "@/components/form/SelectField";
import Button from "@/components/ui/button/Button";
import { TableBodySkeleton } from "@/components/ui/skeleton/Skeleton";
import { api, ApiError } from "@/core/api";
import { useConfirm } from "@/hooks/useConfirm";
import { Link } from "@/i18n/navigation";
import { EyeIcon, PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { Locale } from "@/i18n/routing";
import type {
  AdminEventListItem,
  AdminEventsResponse,
  AdminEventStatusAction,
  EventCloseWarning,
} from "@/types/admin/events";
import type { MockEventStatus } from "@/types/mock";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

const STATUSES: Array<MockEventStatus | "all"> = [
  "all",
  "draft",
  "scheduled",
  "open",
  "closed",
];

function formatUpdatedAt(value: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function parseCloseWarnings(body: unknown): EventCloseWarning[] {
  if (!body || typeof body !== "object") return [];
  const warnings = (body as { warnings?: unknown }).warnings;
  if (!Array.isArray(warnings)) return [];
  return warnings as EventCloseWarning[];
}

export default function EventsTable() {
  const t = useTranslations("adminEvents");
  const tc = useTranslations("confirm");
  const locale = useLocale() as Locale;
  const { confirm } = useConfirm();

  const [events, setEvents] = useState<AdminEventListItem[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<MockEventStatus | "all">("all");
  const [dateRange, setDateRange] = useState<DateRangeValue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ locale });
      if (q.trim()) params.set("q", q.trim());
      if (status !== "all") params.set("status", status);
      if (dateRange?.start) {
        params.set("startDate", new Date(dateRange.start).toISOString());
      }
      if (dateRange?.end) {
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59, 999);
        params.set("endDate", end.toISOString());
      }
      const data = await api.get<AdminEventsResponse>(
        `/admin/events?${params.toString()}`,
      );
      setEvents(data.events);
    } catch {
      setError(t("loadError"));
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, locale, q, status, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const formatCloseWarningMessage = (
    eventTitle: string,
    warnings: EventCloseWarning[],
  ) => {
    const lines = warnings.map((warning) => {
      const typeLabel = t(`formTypes.${warning.formType}`);
      const reasonLabels = warning.reasons.map((reason) =>
        t(`closeReasons.${reason}`),
      );
      return `• ${typeLabel}: ${reasonLabels.join(", ")}`;
    });
    return [t("confirmCloseWithWarnings", { title: eventTitle }), ...lines].join(
      "\n",
    );
  };

  const runStatusAction = async (
    event: AdminEventListItem,
    action: AdminEventStatusAction,
  ) => {
    if (action === "start") {
      const confirmed = await confirm({
        title: t("start"),
        message: t("confirmStart", { title: event.title }),
        confirmLabel: t("start"),
        cancelLabel: tc("cancel"),
        variant: "warning",
      });
      if (!confirmed) return;

      setPendingId(event.id);
      try {
        await api.patch(`/admin/events/${event.id}/status`, { action: "start" });
        await load();
      } catch {
        setError(t("actionError"));
      } finally {
        setPendingId(null);
      }
      return;
    }

    const firstConfirm = await confirm({
      title: t("close"),
      message: t("confirmClose", { title: event.title }),
      confirmLabel: t("close"),
      cancelLabel: tc("cancel"),
      variant: "danger",
    });
    if (!firstConfirm) return;

    setPendingId(event.id);
    try {
      await api.patch(`/admin/events/${event.id}/status`, {
        action: "close",
      });
      await load();
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.status === 409 &&
        err.message === "CLOSE_HAS_ACTIVE_FORMS"
      ) {
        const warnings = parseCloseWarnings(err.body);
        const forceConfirm = await confirm({
          title: t("close"),
          message: formatCloseWarningMessage(event.title, warnings),
          confirmLabel: t("forceClose"),
          cancelLabel: tc("cancel"),
          variant: "danger",
        });
        if (!forceConfirm) return;
        try {
          await api.patch(`/admin/events/${event.id}/status`, {
            action: "close",
            force: true,
          });
          await load();
        } catch {
          setError(t("actionError"));
        }
      } else {
        setError(t("actionError"));
      }
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-theme-xs text-gray-500 dark:text-gray-400">
              {t("searchPlaceholder")}
            </label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-theme-xs text-gray-500 dark:text-gray-400">
              {t("columns.status")}
            </label>
            <SelectField
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as MockEventStatus | "all")
              }
            >
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value === "all" ? t("allStatuses") : t(`status.${value}`)}
                </option>
              ))}
            </SelectField>
          </div>
          <div>
            <DateRangePicker
              label={t("dateRange")}
              placeholder={t("dateRangePlaceholder")}
              value={dateRange}
              onChange={setDateRange}
            />
          </div>
        </div>
        <Link href="/admin/events/new">
          <Button>+ {t("createNew")}</Button>
        </Link>
      </div>

      {error ? (
        <p className="rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-white/5">
              <tr>
                <th className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  {t("columns.title")}
                </th>
                <th className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  {t("columns.slug")}
                </th>
                <th className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  {t("columns.admin")}
                </th>
                <th className="px-4 py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  {t("columns.status")}
                </th>
                <th className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  {t("columns.updatedAt")}
                </th>
                <th className="px-4 py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  {t("columns.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {isLoading ? (
                <TableBodySkeleton columns={6} rows={6} />
              ) : events.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    {t("empty")}
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr key={event.id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-white/90">
                      {event.title}
                    </td>
                    <td className="px-4 py-3 font-mono text-theme-xs text-gray-500 dark:text-gray-400">
                      {event.slug}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {event.adminName ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <EventStatusBadge status={event.status} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {formatUpdatedAt(event.updatedAt, locale)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        <Link
                          href={`/admin/events/${event.id}`}
                          title={t("view")}
                          aria-label={t("view")}
                          className="inline-flex size-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                        >
                          <EyeIcon className="size-5" />
                        </Link>
                        {event.status === "draft" ? (
                          <Link
                            href={`/admin/events/${event.id}/edit`}
                            title={t("edit")}
                            aria-label={t("edit")}
                            className="inline-flex size-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                          >
                            <PencilSquareIcon className="size-5" />
                          </Link>
                        ) : null}
                        {event.status === "scheduled" && event.canStart ? (
                          <button
                            type="button"
                            title={t("start")}
                            aria-label={t("start")}
                            disabled={pendingId === event.id}
                            onClick={() => void runStatusAction(event, "start")}
                            className="rounded-lg border border-brand-200 px-2.5 py-1.5 text-theme-xs font-medium text-brand-600 transition hover:bg-brand-50 disabled:opacity-50 dark:border-brand-500/30 dark:text-brand-400 dark:hover:bg-brand-500/10"
                          >
                            {t("start")}
                          </button>
                        ) : null}
                        {event.status === "open" ? (
                          <button
                            type="button"
                            title={t("close")}
                            aria-label={t("close")}
                            disabled={pendingId === event.id}
                            onClick={() => void runStatusAction(event, "close")}
                            className="inline-flex size-9 items-center justify-center rounded-lg border border-error-200 text-error-500 transition hover:border-error-300 hover:bg-error-50 hover:text-error-600 disabled:opacity-50 dark:border-error-500/30 dark:text-error-400 dark:hover:border-error-500/50 dark:hover:bg-error-500/10"
                          >
                            <TrashIcon className="size-5 shrink-0" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
