"use client";

import {
  actionBadgeClass,
  formatActivityTime,
  formatMetadata,
  matchesActivitySearch,
  translateActivityModule,
  type ActivityMetaTranslate,
} from "@/components/admin/activity/activity-format";
import UserActivityProfileModal from "@/components/admin/activity/UserActivityProfileModal";
import DateRangePicker, {
  type DateRangeValue,
} from "@/components/form/DateRangePicker";
import { TableBodySkeleton } from "@/components/ui/skeleton/Skeleton";
import { api } from "@/core/api";
import { resolveActivityModulePath } from "@/core/audit/module-path";
import { useConfirm } from "@/hooks/useConfirm";
import { useRouter } from "@/i18n/navigation";
import type {
  AdminActivityItem,
  AdminActivityResponse,
} from "@/types/admin/activity";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 10;

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

export default function EventActivityPanel() {
  const t = useTranslations("eventActivity");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { confirm } = useConfirm();
  const router = useRouter();
  const translateMeta = useMemo<ActivityMetaTranslate>(
    () => (key, values) => t(key as never, values as never),
    [t],
  );
  const [data, setData] = useState<AdminActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRangeValue | null>(null);
  const [search, setSearch] = useState("");
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ locale });
      if (dateRange?.start) {
        params.set("startDate", new Date(dateRange.start).toISOString());
      }
      if (dateRange?.end) {
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59, 999);
        params.set("endDate", end.toISOString());
      }
      const response = await api.get<AdminActivityResponse>(
        `/event/activity?${params.toString()}`,
      );
      setData(response);
    } catch {
      setError(t("loadError"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [dateRange, locale, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const openModule = async (item: AdminActivityItem) => {
    const path = resolveActivityModulePath(item.module, { hasEvent: true });
    if (!path) return;
    const moduleLabel = translateActivityModule(item.module, (key) =>
      t(key as never),
    );
    const confirmed = await confirm({
      title: t("openModuleTitle"),
      message: t("openModuleConfirm", { module: moduleLabel }),
      confirmLabel: t("openModuleConfirmLabel"),
      cancelLabel: tc("cancel"),
      variant: "warning",
    });
    if (!confirmed) return;
    router.push(path);
  };

  const stats = data?.stats;
  const items = useMemo(() => {
    const rows = data?.items ?? [];
    return rows.filter((item) =>
      matchesActivitySearch(item, search, {
        translateModule: (key) =>
          translateActivityModule(key, (path) => t(path as never)),
        formatMeta: (metadata) => formatMetadata(metadata, translateMeta),
        platformLabel: t("platformOnly"),
      }),
    );
  }, [data?.items, search, t, translateMeta]);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalItems);
  const paginatedItems = useMemo(
    () => items.slice(startIndex, endIndex),
    [items, startIndex, endIndex],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, dateRange]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { key: "total", value: stats?.total },
          { key: "users", value: stats?.users },
        ].map((card) => (
          <div
            key={card.key}
            className="rounded-2xl border border-event-border bg-white p-4 dark:border-gray-800 dark:bg-white/3"
          >
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              {t(`stats.${card.key}`)}
            </p>
            <p className="mt-1 text-title-sm font-semibold text-gray-900 dark:text-white/90">
              {loading ? "—" : (card.value ?? 0)}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 rounded-2xl border border-event-border bg-white p-4 sm:grid-cols-2 dark:border-gray-800 dark:bg-white/3">
        <div className="min-w-0">
          <label className="mb-1.5 block text-theme-xs text-gray-500 dark:text-gray-400">
            {t("filters.search")}
          </label>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("filters.searchPlaceholder")}
            className="h-11 w-full rounded-lg border border-event-border bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs focus:border-event-action focus:outline-hidden focus:ring-3 focus:ring-event-action/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
        </div>
        <div className="min-w-0">
          <DateRangePicker
            label={t("filters.dateRange")}
            placeholder={t("filters.dateRangePlaceholder")}
            value={dateRange}
            onChange={setDateRange}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-event-border bg-white dark:border-gray-800 dark:bg-white/3">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-theme-xs text-gray-500 uppercase dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-400">
                <th className="px-5 py-3.5 text-start font-medium">
                  {t("columns.time")}
                </th>
                <th className="px-5 py-3.5 text-start font-medium">
                  {t("columns.user")}
                </th>
                <th className="px-5 py-3.5 text-start font-medium">
                  {t("columns.action")}
                </th>
                <th className="px-5 py-3.5 text-start font-medium">
                  {t("columns.detail")}
                </th>
                <th className="px-5 py-3.5 text-start font-medium">
                  {t("columns.module")}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableBodySkeleton rows={6} columns={5} />
              ) : error ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-8 text-center text-error-600 dark:text-error-400"
                  >
                    {error}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    {t("empty")}
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => (
                  <ActivityRow
                    key={item.id}
                    item={item}
                    locale={locale}
                    onOpenProfile={() => setProfileUserId(item.actorUserId)}
                    onOpenRelated={() => {
                      if (item.resourceId) setProfileUserId(item.resourceId);
                    }}
                    onOpenModule={() => void openModule(item)}
                    t={t}
                    translateMeta={translateMeta}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
          <div className="text-xs text-gray-400 dark:text-gray-500">
            {t("showingCount", {
              start: totalItems === 0 ? 0 : startIndex + 1,
              end: endIndex,
              total: totalItems,
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

      <UserActivityProfileModal
        userId={profileUserId}
        isOpen={Boolean(profileUserId)}
        onClose={() => setProfileUserId(null)}
        activityPathPrefix="/event/users"
        translationNamespace="eventActivity"
      />
    </div>
  );
}

function ActivityRow({
  item,
  locale,
  onOpenProfile,
  onOpenRelated,
  onOpenModule,
  t,
  translateMeta,
}: {
  item: AdminActivityItem;
  locale: string;
  onOpenProfile: () => void;
  onOpenRelated: () => void;
  onOpenModule: () => void;
  t: ReturnType<typeof useTranslations<"eventActivity">>;
  translateMeta: ActivityMetaTranslate;
}) {
  const meta = formatMetadata(item.metadata, translateMeta);
  return (
    <tr className="border-b border-gray-100 dark:border-gray-800">
      <td className="px-5 py-3.5 whitespace-nowrap text-gray-600 dark:text-gray-300">
        {formatActivityTime(item.occurredAt, locale)}
      </td>
      <td className="px-5 py-3.5">
        <button
          type="button"
          onClick={onOpenProfile}
          className="text-start font-medium text-event-action hover:underline"
        >
          {item.actorName}
        </button>
      </td>
      <td className="px-5 py-3.5">
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-theme-xs font-medium ${actionBadgeClass(item.actionKind)}`}
        >
          {t(`actions.${item.actionKind}`)}
        </span>
      </td>
      <td className="px-5 py-3.5 text-gray-700 dark:text-gray-200">
        <div>{item.description}</div>
        {meta ? (
          <div className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
            {meta}
          </div>
        ) : null}
        {item.resourceId &&
        (item.resourceType === "sub_user" ||
          item.resourceType === "event_access") &&
        item.resourceId !== item.actorUserId ? (
          <button
            type="button"
            onClick={onOpenRelated}
            className="mt-1 text-theme-xs font-medium text-event-action hover:underline"
          >
            {t("viewRelatedUser")}
          </button>
        ) : null}
      </td>
      <td className="px-5 py-3.5">
        <button
          type="button"
          onClick={onOpenModule}
          className="text-start font-medium text-event-action hover:underline"
          title={t("openModuleHint")}
        >
          {translateActivityModule(item.module, (key) => t(key as never))}
        </button>
      </td>
    </tr>
  );
}
