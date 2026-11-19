"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { ExclamationCircleIcon } from "@heroicons/react/24/outline";
import DateTimePicker from "@/components/form/DateTimePicker";
import { shiftBangkokMinute } from "@/core/i18n/bangkok-datetime";
import { ThFlagIcon, UsFlagIcon } from "@/icons";
import type { FormLocale } from "@/types/event/form";

interface FormHeaderCardProps {
  locale?: FormLocale;
  showLocaleBadge?: boolean;
  title: string;
  description: string;
  opensAt: string | null;
  closesAt: string | null;
  readOnly: boolean;
  isActive: boolean;
  sectionRef?: (el: HTMLDivElement | null) => void;
  onSelect: () => void;
  onChangeTitle: (title: string) => void;
  onChangeDescription: (description: string) => void;
  onChangeOpensAt: (opensAt: string | null) => void;
  onChangeClosesAt: (closesAt: string | null) => void;
}

export default function FormHeaderCard({
  locale = "th",
  showLocaleBadge = true,
  title,
  description,
  opensAt,
  closesAt,
  readOnly,
  isActive,
  sectionRef,
  onSelect,
  onChangeTitle,
  onChangeDescription,
  onChangeOpensAt,
  onChangeClosesAt,
}: FormHeaderCardProps) {
  const scheduleId = useId();
  const tbuilder = useTranslations("form.builder");
  const FlagIcon = locale === "th" ? ThFlagIcon : UsFlagIcon;
  const localeLabel =
    locale === "th" ? tbuilder("langThai") : tbuilder("langEnglish");

  const range = { start: opensAt, end: closesAt };
  const isDateRangeInvalid =
    opensAt && closesAt && Date.parse(opensAt) >= Date.parse(closesAt);

  return (
    <div
      ref={sectionRef}
      onClick={onSelect}
      className={`relative overflow-hidden rounded-xl border bg-white shadow-theme-xs transition-all dark:bg-gray-900 ${
        isActive
          ? "border-gray-300 border-s-4 border-s-brand-500 dark:border-gray-700 dark:border-s-brand-500"
          : "border-gray-200 dark:border-gray-800"
      }`}
    >
      {/* Top Border Line */}
      <div className="absolute top-0 start-0 h-2 w-full bg-brand-500"></div>

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

        {/* Form Schedule: opens_at & closes_at */}
        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2 sm:gap-4 dark:border-gray-800">
          <DateTimePicker
            id={`${scheduleId}-opens`}
            label={tbuilder("opensAt")}
            value={opensAt}
            readOnly={readOnly}
            blockPast
            max={shiftBangkokMinute(closesAt, -1)}
            range={range}
            placeholder={tbuilder("selectDateTime")}
            clearLabel={tbuilder("clearDate")}
            onChange={onChangeOpensAt}
            onFocus={onSelect}
          />
          <DateTimePicker
            id={`${scheduleId}-closes`}
            label={tbuilder("closesAt")}
            value={closesAt}
            readOnly={readOnly}
            blockPast
            min={shiftBangkokMinute(opensAt, 1)}
            range={range}
            placeholder={tbuilder("selectDateTime")}
            clearLabel={tbuilder("clearDate")}
            onChange={onChangeClosesAt}
            onFocus={onSelect}
          />
        </div>

        {isDateRangeInvalid && (
          <div
            role="alert"
            className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-error-600 dark:text-error-400"
          >
            <ExclamationCircleIcon className="h-4 w-4 shrink-0" />
            <span>{tbuilder("dateRangeInvalid")}</span>
          </div>
        )}
      </div>
    </div>
  );
}
