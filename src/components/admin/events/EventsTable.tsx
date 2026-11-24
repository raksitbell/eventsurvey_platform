"use client";

import EventActionsMenu from "./EventActionsMenu";
import EventStatusBadge from "./EventStatusBadge";
import { isTrashableEventStatus } from "@/core/event/trash";
import DateRangePicker, {
  type DateRangeValue,
} from "@/components/form/DateRangePicker";
import SelectField from "@/components/form/SelectField";
import Button from "@/components/ui/button/Button";
import { TableBodySkeleton } from "@/components/ui/skeleton/Skeleton";
import { api, ApiError } from "@/core/api";
import { useAuth } from "@/context/AuthContext";
import { fromBangkokInput } from "@/core/i18n/bangkok-datetime";
import { useConfirm } from "@/hooks/useConfirm";
import { Link } from "@/i18n/navigation";
import {
  ArrowUturnLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { showProgress, showToast } from "@/utils/alert";
import type { Locale } from "@/i18n/routing";
import type {
  AdminEventListItem,
  AdminEventsResponse,
  AdminEventStatusAction,
  EventCloseWarning,
} from "@/types/admin/events";
import type { MockEventStatus } from "@/types/mock";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 10;

const STATUSES: Array<MockEventStatus | "all"> = [
  "all",
  "draft",
  "scheduled",
  "open",
  "closed",
];

function getPageNumbers(
  currentPage: number,
  totalPages: number,
): (number | "...")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }
  if (currentPage >= totalPages - 3) {
    return [
      1,
      "...",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }
  return [
    1,
    "...",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "...",
    totalPages,
  ];
}

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

export default function EventsTable({ showTrash = false }: { showTrash?: boolean }) {
  const t = useTranslations("adminEvents");
  const tc = useTranslations("confirm");
  const ti = useTranslations("eventInspection");
  const locale = useLocale() as Locale;
  const { confirm } = useConfirm();
  const { inspectEvent, canManageEvents, canInspection } = useAuth();

  const [events, setEvents] = useState<AdminEventListItem[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<MockEventStatus | "all">("all");
  const [dateRange, setDateRange] = useState<DateRangeValue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [listRevision, setListRevision] = useState(0);
  const refreshEvents = () => setListRevision((previous) => previous + 1);

  const hasFilters = Boolean(q.trim() || status !== "all" || dateRange);
  const emptyMessage = showTrash
    ? t(hasFilters ? "trash.noMatches" : "trash.empty")
    : t("empty");
  const totalEvents = events.length;
  const totalPages = Math.max(1, Math.ceil(totalEvents / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalEvents);
  const paginatedEvents = useMemo(
    () => events.slice(startIndex, endIndex),
    [events, startIndex, endIndex],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [q, status, dateRange]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const openWorkspace = async (event: AdminEventListItem) => {
    const confirmed = await confirm({
      title: tc("inspectTitle"),
      message: ti("confirmStart", { event: event.title }),
      confirmLabel: t("openWorkspace"),
      cancelLabel: tc("cancel"),
      variant: "warning",
    });
    if (!confirmed) return;

    setOpeningId(event.id);
    try {
      await inspectEvent(event.id);
    } catch {
      showToast({ title: t("openWorkspaceError"), variant: "error" });
      setOpeningId(null);
    }
  };

  useEffect(() => {
    const request = new AbortController();
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ locale });
        if (showTrash) params.set("trash", "true");
        if (q.trim()) params.set("q", q.trim());
        if (status !== "all") params.set("status", status);
        if (dateRange) {
          const start = fromBangkokInput(`${dateRange.start}T00:00`);
          const endMinute = fromBangkokInput(`${dateRange.end}T23:59`);
          if (start) params.set("startDate", start);
          if (endMinute) {
            const end = new Date(Date.parse(endMinute) + 59_999);
            params.set("endDate", end.toISOString());
          }
        }
        const data = await api.get<AdminEventsResponse>(
          `/admin/events?${params.toString()}`,
          request.signal,
        );
        if (!request.signal.aborted) setEvents(data.events);
      } catch {
        if (!request.signal.aborted) setError(t("loadError"));
      } finally {
        if (!request.signal.aborted) setIsLoading(false);
      }
    };
    void load();
    return () => request.abort();
  }, [dateRange, listRevision, locale, q, showTrash, status, t]);

  const changeTrashStatus = async (event: AdminEventListItem) => {
    const actionLabel = t(showTrash ? "trash.restore" : "menu.deleteEvent");
    const confirmed = await confirm({
      title: actionLabel,
      message: t(showTrash ? "trash.confirmRestore" : "menu.confirmDelete", {
        title: event.title,
      }),
      confirmLabel: actionLabel,
      cancelLabel: tc("cancel"),
      variant: showTrash ? "primary" : "danger",
    });
    if (!confirmed) return;

    setPendingId(event.id);
    const path = `/admin/events/${encodeURIComponent(event.id)}`;
    try {
      showProgress(
        t(showTrash ? "trash.restoring" : "menu.deleting"),
        event.title,
      );
      if (showTrash) {
        await api.post(`${path}/restore`, {});
      } else {
        await api.delete(path);
      }
      setEvents((current) => current.filter((row) => row.id !== event.id));
      showToast({
        title: t(showTrash ? "trash.restored" : "menu.deleted"),
        variant: "success",
      });
      refreshEvents();
    } catch (err) {
      let message = t(showTrash ? "trash.restoreError" : "menu.deleteError");
      if (err instanceof ApiError) {
        switch (err.code) {
          case "EVENT_NOT_DELETABLE":
            message = t("menu.trashableStatuses");
            break;
          case "EVENT_NOT_RESTORABLE":
            message = t("trash.noLongerRestorable");
            break;
          case "EVENT_NOT_FOUND":
            message = t("menu.noLongerAvailable");
            break;
          case "SLUG_EXISTS":
            message = t("trash.slugConflict");
            break;
          case "FORBIDDEN":
            message = t("menu.managePermission");
            break;
        }
      }
      showToast({ title: message, variant: "error" });
      refreshEvents();
    } finally {
      setPendingId(null);
    }
  };

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
        refreshEvents();
      } catch {
        setError(t("actionError"));
      } finally {
        setPendingId(null);
      }
      return;
    }

    const label = t(action === "cancel" ? "cancelEvent" : "close");
    const firstConfirm = await confirm({
      title: label,
      message: t("confirmClose", { title: event.title }),
      confirmLabel: label,
      cancelLabel: tc("cancel"),
      variant: "danger",
    });
    if (!firstConfirm) return;

    setPendingId(event.id);
    try {
      await api.patch(`/admin/events/${event.id}/status`, {
        action,
      });
      refreshEvents();
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.status === 409 &&
        err.code === "CLOSE_HAS_ACTIVE_FORMS"
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
          refreshEvents();
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
        {canManageEvents && !showTrash ? (
          <Link href="/admin/events/new">
            <Button>+ {t("createNew")}</Button>
          </Link>
        ) : null}
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
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                paginatedEvents.map((event) => (
                  <tr key={event.id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-white/90">
                      {showTrash ? (
                        event.title
                      ) : (
                        <Link
                          href={`/admin/events/${event.id}`}
                          className="hover:text-brand-600 dark:hover:text-brand-400"
                        >
                          {event.title}
                        </Link>
                      )}
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
                    <td className="px-4 py-3 text-center">
                      {showTrash ? (
                        <RestoreEventAction
                          event={event}
                          canManage={canManageEvents}
                          busy={pendingId !== null}
                          onRestore={() => void changeTrashStatus(event)}
                        />
                      ) : (
                        <EventActionsMenu
                          event={event}
                          canManage={canManageEvents}
                          canInspect={canInspection}
                          busy={pendingId !== null || openingId !== null}
                          onInspect={() => void openWorkspace(event)}
                          onChangeStatus={(action) =>
                            void runStatusAction(event, action)
                          }
                          onDelete={() => void changeTrashStatus(event)}
                        />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4 border-t border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
          <div className="text-xs text-gray-400 dark:text-gray-500">
            {t("showingCount", {
              start: totalEvents === 0 ? 0 : startIndex + 1,
              end: endIndex,
              total: totalEvents,
            })}
          </div>
          <div className="flex items-center gap-2.5 text-xs sm:gap-3">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="inline-flex size-6 items-center justify-center text-gray-500 transition-colors hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30 dark:text-gray-400 dark:hover:text-white"
              aria-label="Previous page"
            >
              <ChevronLeftIcon className="size-3.5" />
            </button>
            {getPageNumbers(currentPage, totalPages).map((item, idx) => {
              if (item === "...") {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="inline-flex min-w-[20px] items-center justify-center px-1 text-xs text-gray-400 select-none dark:text-gray-500"
                  >
                    …
                  </span>
                );
              }
              const isActive = item === currentPage;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCurrentPage(item)}
                  className={`inline-flex min-w-[20px] items-center justify-center px-1 text-xs transition-colors ${
                    isActive
                      ? "font-bold text-gray-900 dark:text-white"
                      : "font-normal text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
                  }`}
                >
                  {item}
                </button>
              );
            })}
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex size-6 items-center justify-center text-gray-500 transition-colors hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30 dark:text-gray-400 dark:hover:text-white"
              aria-label="Next page"
            >
              <ChevronRightIcon className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RestoreEventAction({
  event,
  canManage,
  busy,
  onRestore,
}: {
  event: AdminEventListItem;
  canManage: boolean;
  busy: boolean;
  onRestore: () => void;
}) {
  const t = useTranslations("adminEvents");
  const reason = !canManage
    ? t("menu.managePermission")
    : !isTrashableEventStatus(event.status)
      ? t("trash.noLongerRestorable")
      : undefined;
  const reasonId = `restore-reason-${event.id}`;
  return (
    <>
      <button
        type="button"
        disabled={busy || Boolean(reason)}
        aria-describedby={reason ? reasonId : undefined}
        onClick={onRestore}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-theme-xs font-medium text-gray-700 enabled:hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:enabled:hover:bg-gray-800"
      >
        <ArrowUturnLeftIcon aria-hidden="true" className="size-4" />
        {t("trash.restore")}
      </button>
      {reason && (
        <p
          id={reasonId}
          className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400"
        >
          {reason}
        </p>
      )}
    </>
  );
}
