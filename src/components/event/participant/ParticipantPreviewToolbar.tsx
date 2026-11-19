"use client";

import { Link } from "@/i18n/navigation";
import { ChevronLeftIcon, EyeIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

interface ParticipantPreviewToolbarProps {
  returnHref: string;
  languageControl?: ReactNode;
  children?: ReactNode;
}

export default function ParticipantPreviewToolbar({
  returnHref,
  languageControl,
  children,
}: ParticipantPreviewToolbarProps) {
  const t = useTranslations("eventPreview");

  return (
    <header className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 border-b border-preview-border bg-preview-page px-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-x-4 lg:px-6 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex min-h-14 min-w-0 items-center gap-2 text-participant-text lg:min-h-16 dark:text-gray-100">
        <EyeIcon
          className="hidden size-5 shrink-0 xsm:block"
          aria-hidden="true"
        />
        <div>
          <h1 className="text-preview-control font-bold lg:text-preview-title">
            <span className="lg:hidden">{t("titleCompact")}</span>
            <span className="hidden lg:inline">{t("title")}</span>
          </h1>
          <p className="sr-only text-theme-xs leading-tight text-participant-muted lg:not-sr-only dark:text-gray-400">
            {t("description")}
          </p>
        </div>
      </div>
      {children && (
        <div className="col-span-2 row-start-2 pb-2 lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:pb-0">
          {children}
        </div>
      )}
      <div className="col-start-2 row-start-1 flex items-center justify-end gap-2 lg:col-start-3">
        {languageControl && (
          <div className="max-w-28 sm:max-w-48">{languageControl}</div>
        )}
        <Link
          href={returnHref}
          replace
          className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-preview-control border border-preview-border bg-white px-2.5 text-preview-control font-semibold text-participant-text sm:px-3.5 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
        >
          <ChevronLeftIcon
            className="size-4.5 rtl:rotate-180"
            aria-hidden="true"
          />
          <span className="sm:hidden">{t("backCompact")}</span>
          <span className="hidden sm:inline">{t("back")}</span>
        </Link>
      </div>
    </header>
  );
}
