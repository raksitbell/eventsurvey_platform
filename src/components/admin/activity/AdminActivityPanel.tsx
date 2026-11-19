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
import SelectField from "@/components/form/SelectField";
import { TableBodySkeleton } from "@/components/ui/skeleton/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/core/api";
import { resolveActivityModulePath } from "@/core/audit/module-path";
import { useConfirm } from "@/hooks/useConfirm";
import { useRouter } from "@/i18n/navigation";
import type {
  AdminActivityItem,
  AdminActivityResponse,
} from "@/types/admin/activity";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function AdminActivityPanel() {
  const t = useTranslations("adminActivity");
  const tc = useTranslations("common");
  const ti = useTranslations("eventInspection");
  const locale = useLocale();
  const { confirm } = useConfirm();
  const { inspectEvent } = useAuth();
  const router = useRouter();
  const translateMeta = useMemo<ActivityMetaTranslate>(
    () => (key, values) => t(key as never, values as never),
    [t],
  );
  const [data, setData] = useState<AdminActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventId, setEventId] = useState("");
  const [accountType, setAccountType] = useState<"all" | "platform" | "event">(
    "all",
  );
  const [dateRange, setDateRange] = useState<DateRangeValue | null>(null);
  const [search, setSearch] = useState("");
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [openingModule, setOpeningModule] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ locale });
      if (eventId) params.set("eventId", eventId);
      if (accountType !== "all") params.set("accountType", accountType);
      if (dateRange?.start) {
        params.set("startDate", new Date(dateRange.start).toISOString());
      }
      if (dateRange?.end) {
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59, 999);
        params.set("endDate", end.toISOString());
      }
      const response = await api.get<AdminActivityResponse>(
        `/admin/activity?${params.toString()}`,
      );
      setData(response);
    } catch {
      setError(t("loadError"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [accountType, dateRange, eventId, locale, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const openModule = async (item: AdminActivityItem) => {
    const path = resolveActivityModulePath(item.module, {
      hasEvent: Boolean(item.eventId),
    });
    if (!path || openingModule) return;
    const moduleLabel = translateActivityModule(item.module, (key) =>
      t(key as never),
    );

    if (item.eventId) {
      const eventLabel = item.eventName ?? ti("unnamedEvent");
      const confirmed = await confirm({
        title: tc("inspectTitle"),
        message: t("inspectModuleConfirm", {
          module: moduleLabel,
          event: eventLabel,
        }),
        confirmLabel: t("inspectModuleConfirmLabel"),
        cancelLabel: tc("cancel"),
        variant: "warning",
      });
      if (!confirmed) return;
      setOpeningModule(true);
      try {
        await inspectEvent(item.eventId, path);
      } catch {
        setOpeningModule(false);
      }
      return;
    }

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

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { key: "total", value: stats?.total },
          { key: "users", value: stats?.users },
          { key: "events", value: stats?.events },
          { key: "platform", value: stats?.platform },
        ].map((card) => (
          <div
            key={card.key}
            className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3"
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

      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 lg:flex-row lg:items-end dark:border-gray-800 dark:bg-white/3">
        <div className="min-w-0 flex-1">
          <label className="mb-1.5 block text-theme-xs text-gray-500 dark:text-gray-400">
            {t("filters.search")}
          </label>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("filters.searchPlaceholder")}
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
        </div>
        <div className="min-w-0 w-full shrink-0 lg:w-40">
          <label className="mb-1.5 block text-theme-xs text-gray-500 dark:text-gray-400">
            {t("filters.event")}
          </label>
          <SelectField
            value={eventId}
            onChange={(event) => setEventId(event.target.value)}
          >
            <option value="">{t("filters.allEvents")}</option>
            {(data?.events ?? []).map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="min-w-0 w-full shrink-0 lg:w-40">
          <label className="mb-1.5 block text-theme-xs text-gray-500 dark:text-gray-400">
            {t("filters.accountType")}
          </label>
          <SelectField
            value={accountType}
            onChange={(event) =>
              setAccountType(event.target.value as "all" | "platform" | "event")
            }
          >
            <option value="all">{t("filters.allAccounts")}</option>
            <option value="platform">{t("filters.platform")}</option>
            <option value="event">{t("filters.eventAccount")}</option>
          </SelectField>
        </div>
        <div className="min-w-0 w-full shrink-0 lg:w-56">
          <DateRangePicker
            label={t("filters.dateRange")}
            placeholder={t("filters.dateRangePlaceholder")}
            value={dateRange}
            onChange={setDateRange}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
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
                  {t("columns.event")}
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
                <TableBodySkeleton rows={6} columns={6} />
              ) : error ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-8 text-center text-error-600 dark:text-error-400"
                  >
                    {error}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    {t("empty")}
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <ActivityRow
                    key={item.id}
                    item={item}
                    locale={locale}
                    filteredEventId={eventId}
                    onOpenProfile={() => setProfileUserId(item.actorUserId)}
                    onFilterEvent={() => {
                      if (item.eventId) setEventId(item.eventId);
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
      </div>

      <UserActivityProfileModal
        userId={profileUserId}
        isOpen={Boolean(profileUserId)}
        onClose={() => setProfileUserId(null)}
      />
    </div>
  );
}

function ActivityRow({
  item,
  locale,
  filteredEventId,
  onOpenProfile,
  onFilterEvent,
  onOpenModule,
  t,
  translateMeta,
}: {
  item: AdminActivityItem;
  locale: string;
  filteredEventId: string;
  onOpenProfile: () => void;
  onFilterEvent: () => void;
  onOpenModule: () => void;
  t: ReturnType<typeof useTranslations<"adminActivity">>;
  translateMeta: ActivityMetaTranslate;
}) {
  const meta = formatMetadata(item.metadata, translateMeta);
  const eventActive = Boolean(item.eventId) && filteredEventId === item.eventId;

  return (
    <tr className="border-b border-gray-100 dark:border-gray-800">
      <td className="px-5 py-3.5 whitespace-nowrap text-gray-600 dark:text-gray-300">
        {formatActivityTime(item.occurredAt, locale)}
      </td>
      <td className="px-5 py-3.5">
        <button
          type="button"
          onClick={onOpenProfile}
          className="text-start font-medium text-brand-600 hover:underline dark:text-brand-400"
        >
          {item.actorName}
        </button>
      </td>
      <td className="px-5 py-3.5">
        {item.eventId && item.eventName ? (
          <button
            type="button"
            onClick={onFilterEvent}
            className={`text-start font-medium hover:underline ${
              eventActive
                ? "text-brand-700 dark:text-brand-300"
                : "text-brand-600 dark:text-brand-400"
            }`}
            title={t("filterByEventHint")}
          >
            {item.eventName}
          </button>
        ) : (
          <span className="text-gray-600 dark:text-gray-300">
            {t("platformOnly")}
          </span>
        )}
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
      </td>
      <td className="px-5 py-3.5">
        <button
          type="button"
          onClick={onOpenModule}
          className="text-start font-medium text-brand-600 hover:underline dark:text-brand-400"
          title={t("openModuleHint")}
        >
          {translateActivityModule(item.module, (key) => t(key as never))}
        </button>
      </td>
    </tr>
  );
}
