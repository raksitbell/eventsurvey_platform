"use client";

import EventStatusChart from "./EventStatusChart";
import PlatformGrowthChart from "./PlatformGrowthChart";
import TopEventsChart from "./TopEventsChart";
import Skeleton from "@/components/ui/skeleton/Skeleton";
import { api } from "@/core/api";
import { formatDateTime } from "@/core/i18n/format-datetime";
import type { Locale } from "@/i18n/routing";
import type { AdminOverviewResponse, HealthStatus } from "@/types/admin/overview";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const metricKeys = [
  "events",
  "users",
  "registrationForms",
  "surveys",
] as const;

const healthKeys = ["coreApi", "database", "formSystem"] as const;

function healthBadgeClass(status: HealthStatus) {
  return status === "operational"
    ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400"
    : "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400";
}

export default function PlatformOverview() {
  const t = useTranslations("adminHome");
  const locale = useLocale() as Locale;
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await api.get<AdminOverviewResponse>(
          `/admin/overview?locale=${encodeURIComponent(locale)}`,
        );
        if (!cancelled) {
          setOverview(data);
          setError(null);
        }
      } catch {
        if (!cancelled) setError(t("loadError"));
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [locale, t]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white/90">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("description")}
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricKeys.map((key) => {
          const pair = overview?.metrics[key];
          return (
            <div
              key={key}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/3"
            >
              <p className="text-theme-sm text-gray-500 dark:text-gray-400">
                {t(`metrics.${key}`)}
              </p>
              <div className="mt-3">
                {pair ? (
                  <p className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                    <span>{pair.active}</span>
                    <span className="mx-1 text-xl font-medium text-gray-400 dark:text-gray-500">
                      /
                    </span>
                    <span className="text-xl font-medium text-gray-500 dark:text-gray-400">
                      {pair.total}
                    </span>
                  </p>
                ) : (
                  <Skeleton className="h-9 w-28" />
                )}
              </div>
              <p className="mt-2 text-theme-xs text-gray-400 dark:text-gray-500">
                {t("metrics.activeLabel")} / {t("metrics.totalLabel")}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs xl:col-span-2 dark:border-gray-800 dark:bg-white/3">
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white/90">
            {t("recentActivity")}
          </h2>
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {!overview ? (
              Array.from({ length: 4 }).map((_, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Skeleton className="size-2.5 shrink-0 rounded-full" />
                    <Skeleton className="h-4 w-full max-w-64" />
                  </div>
                  <Skeleton className="h-3 w-20" />
                </li>
              ))
            ) : overview.recentActivity.length === 0 ? (
              <li className="py-3 text-sm text-gray-500 dark:text-gray-400">
                {t("noActivity")}
              </li>
            ) : (
              overview.recentActivity.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="size-2.5 shrink-0 rounded-full bg-brand-500" />
                    <span className="truncate text-theme-sm text-gray-700 dark:text-gray-300">
                      {item.description}
                    </span>
                  </div>
                  <span className="shrink-0 text-theme-xs text-gray-400">
                    {formatDateTime(item.at, locale)}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/3">
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white/90">
            {t("serviceStatus")}
          </h2>
          <ul className="space-y-3">
            {healthKeys.map((key) => {
              const status = overview?.health[key];
              return (
                <li
                  key={key}
                  className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-3 dark:bg-white/5"
                >
                  <span className="text-theme-sm text-gray-700 dark:text-gray-300">
                    {t(`health.${key}`)}
                  </span>
                  {status ? (
                    <span
                      className={`rounded-full px-2.5 py-1 text-theme-xs font-medium ${healthBadgeClass(status)}`}
                    >
                      {t(`health.status.${status}`)}
                    </span>
                  ) : (
                    <Skeleton className="h-6 w-20 rounded-full" />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs xl:col-span-2 dark:border-gray-800 dark:bg-white/3">
          <h2 className="mb-1 text-base font-semibold text-gray-900 dark:text-white/90">
            {t("growthTitle")}
          </h2>
          <p className="mb-4 text-theme-xs text-gray-500 dark:text-gray-400">
            {t("growthHint")}
          </p>
          <PlatformGrowthChart growth={overview?.growth ?? null} />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/3">
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white/90">
            {t("eventStatusTitle")}
          </h2>
          <EventStatusChart breakdown={overview?.eventStatusBreakdown ?? null} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/3">
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white/90">
            {t("topEventsTitle")}
          </h2>
          <TopEventsChart topEvents={overview?.topEvents ?? null} />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/3">
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white/90">
            {t("piiActivityTitle")}
          </h2>
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {!overview ? (
              Array.from({ length: 3 }).map((_, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Skeleton className="size-2.5 shrink-0 rounded-full" />
                    <Skeleton className="h-4 w-full max-w-56" />
                  </div>
                  <Skeleton className="h-3 w-20" />
                </li>
              ))
            ) : overview.piiActivity.length === 0 ? (
              <li className="py-3 text-sm text-gray-500 dark:text-gray-400">
                {t("piiActivityEmpty")}
              </li>
            ) : (
              overview.piiActivity.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="size-2.5 shrink-0 rounded-full bg-warning-500" />
                    <span className="truncate text-theme-sm text-gray-700 dark:text-gray-300">
                      {item.description}
                    </span>
                  </div>
                  <span className="shrink-0 text-theme-xs text-gray-400">
                    {formatDateTime(item.at, locale)}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
