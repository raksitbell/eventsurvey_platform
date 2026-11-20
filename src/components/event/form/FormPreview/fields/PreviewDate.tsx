"use client";

import { useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { calendarOptions } from "@/components/form/calendar-options";
import flatpickr from "flatpickr";
import type { Instance } from "flatpickr/dist/types/instance";
import "flatpickr/dist/flatpickr.css";
import { CalendarDaysIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface PreviewDateProps {
  value: string;
  onChange: (value: string) => void;
}

const answerFormat = "Y-m-d H:i";

export default function PreviewDate({ value, onChange }: PreviewDateProps) {
  const locale = useLocale();
  const tPreview = useTranslations("form.preview");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fpRef = useRef<Instance | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!inputRef.current) return;

    const instance = flatpickr(inputRef.current, {
      ...calendarOptions(locale),
      enableTime: true,
      time_24hr: true,
      dateFormat: "d/m/Y H:i",
      onChange: ([date], _, picker) => {
        onChangeRef.current(date ? picker.formatDate(date, answerFormat) : "");
      },
    });

    fpRef.current = instance;

    return () => {
      instance.destroy();
      fpRef.current = null;
    };
  }, [locale]);

  useEffect(() => {
    const picker = fpRef.current;
    if (!picker) return;
    const [date] = picker.selectedDates;
    if (!value && date) {
      picker.clear(false);
    } else if (value && (!date || value !== picker.formatDate(date, answerFormat))) {
      picker.setDate(value, false, answerFormat);
    }
  }, [locale, value]);

  return (
    <div className="relative w-full max-w-xs">
      <input
        ref={inputRef}
        type="text"
        readOnly
        placeholder={tPreview("selectDateTime")}
        aria-label={tPreview("selectDateTime")}
        className="w-full cursor-pointer rounded-lg border border-gray-300 bg-white py-2.5 ps-3.5 pe-16 text-sm text-gray-800 transition-colors placeholder:text-gray-400 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
      />
      <div className="absolute inset-y-0 end-0 flex items-center gap-1 pe-3">
        {value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fpRef.current?.clear(false);
              onChange("");
            }}
            aria-label={tPreview("clearDate")}
            className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => fpRef.current?.open()}
          aria-label={tPreview("openCalendar")}
          className="rounded p-1 text-gray-500 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          <CalendarDaysIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
