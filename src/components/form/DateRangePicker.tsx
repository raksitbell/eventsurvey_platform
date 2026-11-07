"use client";

import Label from "@/components/form/Label";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import flatpickr from "flatpickr";
import type { Instance } from "flatpickr/dist/types/instance";
import "flatpickr/dist/flatpickr.css";
import { useEffect, useId, useRef } from "react";

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

function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function DateRangePicker({
  label,
  placeholder,
  value,
  onChange,
}: DateRangePickerProps) {
  const autoId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const fpRef = useRef<Instance | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!inputRef.current) return;

    // No altInput — it duplicates the visible field (original + alt).
    fpRef.current = flatpickr(inputRef.current, {
      mode: "range",
      dateFormat: "d/m/Y",
      allowInput: false,
      disableMobile: true,
      defaultDate:
        value?.start && value?.end ? [value.start, value.end] : undefined,
      onChange: (selectedDates) => {
        if (selectedDates.length === 2) {
          onChangeRef.current({
            start: toYmd(selectedDates[0]),
            end: toYmd(selectedDates[1]),
          });
          return;
        }
        if (selectedDates.length === 0) {
          onChangeRef.current(null);
        }
      },
      onClose: (selectedDates) => {
        if (selectedDates.length === 1) {
          fpRef.current?.clear();
          onChangeRef.current(null);
        }
      },
    });

    return () => {
      fpRef.current?.destroy();
      fpRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fp = fpRef.current;
    if (!fp) return;
    if (value?.start && value?.end) {
      const current = fp.selectedDates.map(toYmd).join(",");
      const next = `${value.start},${value.end}`;
      if (current !== next) {
        fp.setDate([value.start, value.end], false);
      }
    } else if (fp.selectedDates.length > 0) {
      fp.clear();
    }
  }, [value]);

  return (
    <div>
      {label ? <Label htmlFor={autoId}>{label}</Label> : null}
      <div className="relative">
        <input
          ref={inputRef}
          id={autoId}
          type="text"
          placeholder={placeholder}
          readOnly
          className="h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 ps-4 pe-11 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
        />
        <span className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
          <CalendarDaysIcon className="size-5" />
        </span>
      </div>
    </div>
  );
}
