"use client";

import { useTranslations } from "next-intl";

export default function AnalyticsHeading() {
  const t = useTranslations("eventAnalytics");

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl dark:text-white">
        {t("title")}
      </h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {t("description")}
      </p>
    </div>
  );
}
