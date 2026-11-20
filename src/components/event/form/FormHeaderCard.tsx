"use client";

import { useTranslations } from "next-intl";
import { ThFlagIcon, UsFlagIcon } from "@/icons";
import type { FormLocale } from "@/types/event/form";

interface FormHeaderCardProps {
  locale?: FormLocale;
  showLocaleBadge?: boolean;
  title: string;
  description: string;
  isActive: boolean;
  sectionRef?: (el: HTMLDivElement | null) => void;
  onSelect: () => void;
  onChangeTitle: (title: string) => void;
  onChangeDescription: (description: string) => void;
}

export default function FormHeaderCard({
  locale = "th",
  showLocaleBadge = true,
  title,
  description,
  isActive,
  sectionRef,
  onSelect,
  onChangeTitle,
  onChangeDescription,
}: FormHeaderCardProps) {
  const tbuilder = useTranslations("form.builder");
  const FlagIcon = locale === "th" ? ThFlagIcon : UsFlagIcon;
  const localeLabel =
    locale === "th" ? tbuilder("langThai") : tbuilder("langEnglish");

  return (
    <div
      ref={sectionRef}
      onClick={onSelect}
      className={`event-form-paper relative overflow-hidden rounded-xl border bg-white shadow-theme-xs transition-all dark:bg-gray-900 ${
        isActive
          ? "border-gray-300 border-s-4 border-s-(--participant-accent) dark:border-gray-700 dark:border-s-(--participant-accent)"
          : "border-gray-200 dark:border-gray-800"
      }`}
    >
      {/* Top Border Line */}
      <div className="absolute top-0 start-0 h-2 w-full bg-(--participant-accent)"></div>

      <div className="px-4 pt-6 pb-5 sm:px-6 sm:pt-8">
        {showLocaleBadge && (
          <div className="mb-3 flex items-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-theme-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              <FlagIcon className="size-3.5 rounded-sm" />
              <span>{localeLabel}</span>
            </span>
          </div>
        )}

        <input
          type="text"
          value={title}
          onFocus={onSelect}
          onChange={(e) => onChangeTitle(e.target.value)}
          placeholder={tbuilder("formTitlePlaceholder")}
          className="w-full border-b border-transparent bg-transparent pb-1 text-xl font-semibold text-gray-800 transition-all placeholder:text-gray-400 hover:border-gray-200 focus:border-b-2 focus:border-brand-500 focus:outline-none sm:text-2xl md:text-3xl dark:text-gray-100 dark:hover:border-gray-700"
        />

        <input
          type="text"
          value={description}
          onFocus={onSelect}
          onChange={(e) => onChangeDescription(e.target.value)}
          placeholder={tbuilder("description")}
          className="mt-2 w-full border-b border-transparent bg-transparent pb-1 text-sm text-gray-600 transition-all placeholder:text-gray-400 hover:border-gray-200 focus:border-b-2 focus:border-brand-500 focus:outline-none dark:text-gray-300 dark:hover:border-gray-700"
        />

      </div>
    </div>
  );
}
