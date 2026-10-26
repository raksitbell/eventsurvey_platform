"use client";

import UserDropdown from "@/components/header/UserDropdown";
import { useSidebar } from "@/context/SidebarContext";
import { useTranslations } from "next-intl";
import type React from "react";
import { useState } from "react";

const AppHeader: React.FC = () => {
  const t = useTranslations("header");
  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();
  const [range, setRange] = useState("30");

  const handleToggle = () => {
    if (window.innerWidth >= 1280) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  return (
    <header className="sticky top-0 z-99999 flex w-full border-b border-gray-200 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-900/90">
      <div className="flex w-full grow items-center gap-3 px-3 py-3 xl:gap-4 xl:px-6 xl:py-4">
        <button
          className={`z-99999 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-500 lg:h-11 lg:w-11 dark:border-gray-800 dark:text-gray-400 ${
            isMobileOpen
              ? "bg-gray-100 dark:bg-white/3"
              : "bg-white dark:bg-gray-900"
          }`}
          onClick={handleToggle}
          aria-label={t("toggleSidebar")}
        >
          {isMobileOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                fill="currentColor"
              />
            </svg>
          ) : (
            <svg
              className="rtl:-scale-x-100"
              width="16"
              height="12"
              viewBox="0 0 16 12"
              fill="none"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M0.583252 1C0.583252 0.585786 0.919038 0.25 1.33325 0.25H14.6666C15.0808 0.25 15.4166 0.585786 15.4166 1C15.4166 1.41421 15.0808 1.75 14.6666 1.75H1.33325C0.919038 1.75 0.583252 1.41421 0.583252 1ZM0.583252 6C0.583252 5.58579 0.919038 5.25 1.33325 5.25H14.6666C15.0808 5.25 15.4166 5.58579 15.4166 6C15.4166 6.41421 15.0808 6.75 14.6666 6.75H1.33325C0.919038 6.75 0.583252 6.41421 0.583252 6ZM1.33325 10.25C0.919038 10.25 0.583252 10.5858 0.583252 11C0.583252 11.4142 0.919038 11.75 1.33325 11.75H14.6666C15.0808 11.75 15.4166 11.4142 15.4166 11C15.4166 10.5858 15.0808 10.25 14.6666 10.25H1.33325Z"
                fill="currentColor"
              />
            </svg>
          )}
        </button>

        <div className="relative hidden min-w-0 flex-1 md:block">
          <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-gray-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.3-4.3"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <input
            type="search"
            placeholder={t("searchPlaceholder")}
            className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 ps-10 pe-4 text-sm text-gray-700 outline-hidden placeholder:text-gray-400 focus:border-brand-300 focus:bg-white focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/5 dark:text-gray-200 dark:placeholder:text-gray-500"
          />
        </div>

        <div className="ms-auto flex items-center gap-2 sm:gap-3">
          <label className="relative hidden sm:block">
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="h-11 appearance-none rounded-xl border border-gray-200 bg-white pe-9 ps-3 text-theme-sm font-medium text-gray-700 outline-hidden dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
            >
              <option value="7">{t("ranges.last7")}</option>
              <option value="30">{t("ranges.last30")}</option>
              <option value="90">{t("ranges.last90")}</option>
            </select>
            <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-gray-400">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                <path
                  d="M5 7.5 10 12.5 15 7.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </label>

          <button
            type="button"
            className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400"
            aria-label={t("notifications")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 9a6 6 0 1 1 12 0c0 7 3 7 3 7H3s3 0 3-7ZM10 19a2 2 0 0 0 4 0"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="absolute end-2.5 top-2.5 size-2 rounded-full bg-error-500" />
          </button>

          <UserDropdown />
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
