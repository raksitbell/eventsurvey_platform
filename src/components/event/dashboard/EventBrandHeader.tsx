"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { GlobeIcon } from "@/icons";
import { useLocale, useTranslations } from "next-intl";

export default function EventBrandHeader() {
  const t = useTranslations("eventAnalytics.brand");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  const toggleLanguage = () => {
    const nextLocale: Locale = locale === "th" ? "en" : "th";
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <div className="flex items-center justify-between pb-6 border-b border-gray-100 dark:border-gray-800">
      <div className="flex items-center gap-3">
        {/* Purple squircle app icon matching screenshot */}
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-500 shadow-theme-xs">
          <svg
            className="size-6 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="18" height="18" x="3" y="3" rx="4" />
            <path d="M8 12h8" />
            <path d="M8 8h8" />
            <path d="M8 16h5" />
          </svg>
        </div>

        <div>
          <h1 className="text-base font-bold text-gray-900 dark:text-white">
            {t("title")}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t("subtitle")}
          </p>
        </div>
      </div>

      {/* Language Switcher Button "🌐 TH" matching screenshot */}
      <button
        type="button"
        onClick={toggleLanguage}
        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-theme-xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
        title="Switch language"
      >
        <GlobeIcon className="size-3.5 text-gray-500 dark:text-gray-400" />
        <span>{locale.toUpperCase()}</span>
      </button>
    </div>
  );
}
