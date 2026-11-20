"use client";

import Label from "@/components/form/Label";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import flatpickr from "flatpickr";
import type { Instance } from "flatpickr/dist/types/instance";
import "flatpickr/dist/flatpickr.css";
import { useLocale } from "next-intl";
import { useEffect, useId, useRef } from "react";
import { calendarOptions } from "./calendar-options";

export type DateRangeValue = {
  start: string;
  end: string;
};

type DateRangePickerProps = {
  label?: string;
  placeholder?: string;
  value: DateRangeValue | null;
  onChange: (value: DateRangeValue | null) => void;
};

const storedDateFormat = "Y-m-d";

export default function DateRangePicker({
  label,
  placeholder,
  value,
  onChange,
}: DateRangePickerProps) {
  const locale = useLocale();
  const autoId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const fpRef = useRef<Instance | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!inputRef.current) return;

    const picker = flatpickr(inputRef.current, {
      ...calendarOptions(locale),
      mode: "range",
      dateFormat: "d/m/Y",
      onChange: ([start, end], _, instance) => {
        if (start && end) {
          onChangeRef.current({
            start: instance.formatDate(start, storedDateFormat),
            end: instance.formatDate(end, storedDateFormat),
          });
        } else if (!start) {
          onChangeRef.current(null);
        }
      },
      onClose: (selectedDates, _, instance) => {
        if (selectedDates.length === 1) {
          instance.clear(false);
          onChangeRef.current(null);
        }
      },
    });
    picker.calendarContainer.classList.add("date-range-calendar");
    fpRef.current = picker;

    return () => {
      picker.destroy();
      fpRef.current = null;
    };
  }, [locale]);

  useEffect(() => {
    const fp = fpRef.current;
    if (!fp) return;
    if (value?.start && value?.end) {
      const current = fp.selectedDates
        .map((day) => fp.formatDate(day, storedDateFormat))
        .join(",");
      const next = `${value.start},${value.end}`;
      if (current !== next) {
        fp.setDate([value.start, value.end], false, storedDateFormat);
      }
    } else if (fp.selectedDates.length > 0) {
      fp.clear(false);
    }
  }, [locale, value]);

  return (
    <div>
      {label ? <Label htmlFor={autoId}>{label}</Label> : null}
      <div className="relative">
        <input
          ref={inputRef}
          id={autoId}
          type="text"
          placeholder={placeholder}
          aria-label={label ? undefined : placeholder}
          readOnly
          className="h-11 w-full cursor-pointer rounded-lg border border-gray-300 bg-transparent py-2.5 ps-4 pe-11 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
        />
        <span className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
          <CalendarDaysIcon className="size-5" aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}
