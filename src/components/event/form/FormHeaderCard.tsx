"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import flatpickr from "flatpickr";
import type { Instance } from "flatpickr/dist/types/instance";
import "flatpickr/dist/flatpickr.min.css";
import {
  CalendarDaysIcon,
  ExclamationCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { ThFlagIcon, UsFlagIcon } from "@/icons";
import { FormLocale } from "@/types/event/form";

interface DateTimeFieldProps {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
}

function DateTimeField({
  label,
  value,
  placeholder,
  onChange,
  onFocus,
}: DateTimeFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fpRef = useRef<Instance | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!inputRef.current) return;

    const instance = flatpickr(inputRef.current, {
      enableTime: true,
      time_24hr: true,
      dateFormat: "Y-m-d H:i",
      defaultDate: value || undefined,
      disableMobile: true,
      onChange: (_, dateStr) => {
        onChangeRef.current(dateStr);
      },
    });

    fpRef.current = Array.isArray(instance) ? instance[0] : instance;

    return () => {
      fpRef.current?.destroy();
      fpRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!fpRef.current) return;
    const currentFormatted = fpRef.current.input.value;
    if (!value && currentFormatted) {
      fpRef.current.clear(false);
    } else if (value && value !== currentFormatted) {
      fpRef.current.setDate(value, false);
    }
  }, [value]);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
        {label}
      </span>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          readOnly
          value={value}
          onFocus={onFocus}
          placeholder={placeholder}
          className="w-full cursor-pointer rounded-lg border border-gray-200 bg-gray-50 py-2 ps-3 pe-16 text-sm text-gray-800 transition-colors placeholder:text-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:bg-gray-900"
        />
        <div className="absolute inset-y-0 end-0 flex items-center gap-1 pe-2.5">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fpRef.current?.clear(false);
                onChange("");
              }}
              aria-label="Clear date"
              className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
          <CalendarDaysIcon className="pointer-events-none h-4 w-4 text-gray-500 dark:text-gray-400" />
        </div>
      </div>
    </div>
  );
}

interface FormHeaderCardProps {
  locale?: FormLocale;
  showLocaleBadge?: boolean;
  title: string;
  description: string;
  opensAt: string;
  closesAt: string;
  isActive: boolean;
  sectionRef?: (el: HTMLDivElement | null) => void;
  onSelect: () => void;
  onChangeTitle: (title: string) => void;
  onChangeDescription: (description: string) => void;
  onChangeOpensAt: (opensAt: string) => void;
  onChangeClosesAt: (closesAt: string) => void;
}

export default function FormHeaderCard({
  locale = "th",
  showLocaleBadge = true,
  title,
  description,
  opensAt,
  closesAt,
  isActive,
  sectionRef,
  onSelect,
  onChangeTitle,
  onChangeDescription,
  onChangeOpensAt,
  onChangeClosesAt,
}: FormHeaderCardProps) {
  const tbuilder = useTranslations("form.builder");
  const FlagIcon = locale === "th" ? ThFlagIcon : UsFlagIcon;
  const localeLabel =
    locale === "th" ? tbuilder("langThai") : tbuilder("langEnglish");

  const isDateRangeInvalid =
    Boolean(opensAt && closesAt) && opensAt > closesAt;

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
          className="w-full border-b border-transparent bg-transparent pb-1 text-xl font-semibold text-gray-800 transition-all placeholder:text-gray-400 hover:border-gray-200 focus:border-b-2 focus:border-brand-500 focus:outline-none sm:text-2xl md:text-3xl dark:text-gray-100 dark:hover:border-gray-700"
        />

        <input
          type="text"
          value={description}
          onFocus={onSelect}
          onChange={(e) => onChangeDescription(e.target.value)}
          className="mt-2 w-full border-b border-transparent bg-transparent pb-1 text-sm text-gray-600 transition-all placeholder:text-gray-400 hover:border-gray-200 focus:border-b-2 focus:border-brand-500 focus:outline-none dark:text-gray-300 dark:hover:border-gray-700"
        />

        {/* Form Schedule: opens_at & closes_at */}
        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2 sm:gap-4 dark:border-gray-800">
          <DateTimeField
            label={tbuilder("opensAt")}
            value={opensAt}
            placeholder={tbuilder("selectDateTime")}
            onChange={onChangeOpensAt}
            onFocus={onSelect}
          />
          <DateTimeField
            label={tbuilder("closesAt")}
            value={closesAt}
            placeholder={tbuilder("selectDateTime")}
            onChange={onChangeClosesAt}
            onFocus={onSelect}
          />
        </div>

        {isDateRangeInvalid && (
          <div className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-error-600 dark:text-error-400">
            <ExclamationCircleIcon className="h-4 w-4 shrink-0" />
            <span>{tbuilder("dateRangeInvalid")}</span>
          </div>
        )}
      </div>
    </div>
  );
}
