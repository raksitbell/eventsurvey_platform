"use client";

import { useTranslations } from "next-intl";

interface MetricCardItem {
  key: "registrations" | "attendance" | "surveyResponses" | "completion";
}

const metricKeys: MetricCardItem[] = [
  { key: "registrations" },
  { key: "attendance" },
  { key: "surveyResponses" },
  { key: "completion" },
];

export default function MetricCardsGrid() {
  const t = useTranslations("eventAnalytics.metrics");

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metricKeys.map((item) => (
        <div
          key={item.key}
          className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/3"
        >
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {t(`${item.key}.title`)}
          </span>
          <div className="mt-3">
            <h3 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              {t(`${item.key}.value`)}
            </h3>
            <p className="mt-2 text-xs font-medium text-success-600 dark:text-success-400">
              {t(`${item.key}.trend`)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
