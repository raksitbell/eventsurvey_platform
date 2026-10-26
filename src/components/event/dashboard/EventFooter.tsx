"use client";

import { useTranslations } from "next-intl";

export default function EventFooter() {
  const t = useTranslations("eventAnalytics.footer");

  return (
    <footer className="flex flex-col items-center justify-between gap-3 pt-8 pb-4 text-xs text-gray-500 sm:flex-row dark:text-gray-400">
      <p>{t("copyright")}</p>
      <button
        type="button"
        className="transition hover:text-gray-700 dark:hover:text-gray-200"
        onClick={() => alert("Privacy Policy")}
      >
        {t("privacyPolicy")}
      </button>
    </footer>
  );
}
