"use client";

import ResponseActivityChart from "@/components/admin/ResponseActivityChart";
import { api } from "@/core/api";
import { Link } from "@/i18n/navigation";
import { ArrowRightIcon } from "@/icons";
import type { AdminOverviewResponse } from "@/types/admin/overview";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const healthItems = [
  { key: "coreApi", status: "operational" as const },
  { key: "responseQueue", status: "operational" as const },
  { key: "storage", status: "attention" as const },
];

function formatMetric(value: number, key: string) {
  if (key === "responses" && value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return String(value);
}

export default function PlatformOverview() {
  const t = useTranslations("adminHome");
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await api.get<AdminOverviewResponse>("/admin/overview");
        if (!cancelled) {
          setOverview(data);
          setError(null);
        }
      } catch {
        if (!cancelled) setError(t("loadError"));
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const metrics = [
    {
      key: "owners" as const,
      value: overview ? formatMetric(overview.metrics.owners, "owners") : "—",
    },
    {
      key: "events" as const,
      value: overview ? formatMetric(overview.metrics.events, "events") : "—",
    },
    {
      key: "forms" as const,
      value: overview ? formatMetric(overview.metrics.forms, "forms") : "—",
    },
    {
      key: "responses" as const,
      value: overview
        ? formatMetric(overview.metrics.responses, "responses")
        : "—",
    },
  ];

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
        {metrics.map((metric) => (
          <div
            key={metric.key}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/3"
          >
            <p className="text-theme-sm text-gray-500 dark:text-gray-400">
              {t(`metrics.${metric.key}`)}
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs xl:col-span-2 dark:border-gray-800 dark:bg-white/3">
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white/90">
            {t("responseActivity")}
          </h2>
          <ResponseActivityChart />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/3">
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white/90">
            {t("systemHealth")}
          </h2>
          <ul className="space-y-3">
            {healthItems.map((item) => (
              <li
                key={item.key}
                className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-3 dark:bg-white/5"
              >
                <span className="text-theme-sm text-gray-700 dark:text-gray-300">
                  {t(`health.${item.key}`)}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-theme-xs font-medium ${
                    item.status === "operational"
                      ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400"
                      : "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400"
                  }`}
                >
                  {t(`health.status.${item.status}`)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs xl:col-span-2 dark:border-gray-800 dark:bg-white/3">
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white/90">
            {t("recentActivity")}
          </h2>
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {(overview?.recentActivity ?? []).length === 0 ? (
              <li className="py-3 text-sm text-gray-500 dark:text-gray-400">
                {t("noActivity")}
              </li>
            ) : (
              overview?.recentActivity.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="size-2.5 rounded-full bg-brand-500" />
                    <span className="text-theme-sm text-gray-700 dark:text-gray-300">
                      {t(`activity.${item.labelKey}`)}
                    </span>
                  </div>
                  <span className="shrink-0 text-theme-xs text-gray-400">
                    {new Date(item.at).toLocaleDateString()}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/3">
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white/90">
            {t("governance")}
          </h2>
          <div className="space-y-2">
            <Link
              href="/admin/users"
              className="flex items-center justify-between rounded-xl px-3 py-3 text-theme-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
            >
              {t("manageOwners")}
              <ArrowRightIcon className="size-4 text-gray-400 rtl:rotate-180" />
            </Link>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-start text-theme-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
            >
              {t("reviewAudit")}
              <ArrowRightIcon className="size-4 text-gray-400 rtl:rotate-180" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
