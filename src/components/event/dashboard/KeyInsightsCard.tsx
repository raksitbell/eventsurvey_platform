"use client";

import { showToast } from "@/utils/toast";
import { useTranslations } from "next-intl";

export default function KeyInsightsCard() {
  const t = useTranslations("eventAnalytics.insights");

  const handleExport = () => {
    // Generate CSV content
    const headers = ["Metric", "Value", "Notes"];
    const rows = [
      ["Registrations", "428", "+12.5% this week"],
      ["Attendance", "312", "72.9% checked in"],
      ["Survey responses", "186", "43.4% response rate"],
      ["Completion rate", "84%", "+6.1% from last event"],
      ["Strongest day", "Saturday", "176 registrations"],
      ["Registration conversion", "68%", "Target met"],
      ["Mobile registration", "54%", "Mobile dominant"],
    ];

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "event-analytics-report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    void showToast(t("exportSuccess"));
  };

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-gray-200/80 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-white/3">
      <div>
        <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
          {t("title")}
        </h3>

        {/* Highlight Banner matching screenshot */}
        <div className="rounded-2xl border border-brand-100/70 bg-brand-50/60 p-4 dark:border-brand-500/20 dark:bg-brand-500/10">
          <p className="text-xs font-semibold text-brand-600 dark:text-brand-400">
            {t("highlightTitle")}
          </p>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
            {t("highlightDesc")}
          </p>
        </div>

        {/* Divider matching screenshot */}
        <div className="my-5 border-t border-gray-100 dark:border-gray-800" />

        {/* Bullet List matching screenshot */}
        <ul className="space-y-3.5 text-xs text-gray-700 dark:text-gray-300">
          <li className="flex items-start gap-2">
            <span className="text-gray-400 select-none">•</span>
            <span>{t("bullet1")}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-gray-400 select-none">•</span>
            <span>{t("bullet2")}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-gray-400 select-none">•</span>
            <span>{t("bullet3")}</span>
          </li>
        </ul>
      </div>

      {/* Export Report Action Button matching screenshot */}
      <div className="mt-6 pt-2">
        <button
          type="button"
          onClick={handleExport}
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 text-center text-xs font-medium text-gray-700 shadow-theme-xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          {t("exportButton")}
        </button>
      </div>
    </div>
  );
}
