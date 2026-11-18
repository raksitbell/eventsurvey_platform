"use client";

import { useTranslations } from "next-intl";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { ThFlagIcon, UsFlagIcon } from "@/icons";
import { FormLocale } from "@/types/event/form";

interface PreviewTopBarProps {
  onExitPreview: () => void;
  showBadge?: boolean;
  hasEnglish?: boolean;
  previewLocale?: FormLocale;
  onChangeLocale?: (locale: FormLocale) => void;
}

export default function PreviewTopBar({
  onExitPreview,
  showBadge = true,
  hasEnglish = false,
  previewLocale = "th",
  onChangeLocale,
}: PreviewTopBarProps) {
  const tPreview = useTranslations("form.preview");

  return (
    <div
      className={`mb-4 flex flex-wrap items-center gap-3 ${
        showBadge ? "justify-between" : "justify-end"
      }`}
    >
      {showBadge && (
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
          {tPreview("button")}
        </span>
      )}

      <div className="flex items-center gap-2">
        {hasEnglish && onChangeLocale && (
          <div className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white p-1 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
            <button
              type="button"
              onClick={() => onChangeLocale("th")}
              aria-pressed={previewLocale === "th"}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-theme-xs font-medium transition ${
                previewLocale === "th"
                  ? "bg-brand-500 text-white"
                  : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
              }`}
            >
              <ThFlagIcon className="size-3.5 rounded-sm" />
              <span>{tPreview("langThai")}</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeLocale("en")}
              aria-pressed={previewLocale === "en"}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-theme-xs font-medium transition ${
                previewLocale === "en"
                  ? "bg-brand-500 text-white"
                  : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
              }`}
            >
              <UsFlagIcon className="size-3.5 rounded-sm" />
              <span>{tPreview("langEnglish")}</span>
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onExitPreview}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-theme-xs transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          <PencilSquareIcon className="h-4 w-4" />
          <span>{tPreview("editForm")}</span>
        </button>
      </div>
    </div>
  );
}

