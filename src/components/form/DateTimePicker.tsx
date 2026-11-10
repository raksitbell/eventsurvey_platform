"use client";

import Label from "@/components/form/Label";
import { fromBangkokInput, toBangkokInput } from "@/core/i18n/bangkok-datetime";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import flatpickr from "flatpickr";
import { Thai } from "flatpickr/dist/l10n/th";
import { english } from "flatpickr/dist/l10n/default";
import type { Instance } from "flatpickr/dist/types/instance";
import "flatpickr/dist/flatpickr.css";
import { useLocale } from "next-intl";
import { useEffect, useRef } from "react";

interface DateTimePickerProps {
  id: string;
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  readOnly?: boolean;
}

/** TailAdmin Flatpickr adapted for controlled Bangkok date/time values. */
export default function DateTimePicker({
  id,
  label,
  value,
  onChange,
  readOnly = false,
}: DateTimePickerProps) {
  const locale = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<Instance | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!inputRef.current) return;
    const picker = flatpickr(inputRef.current, {
      enableTime: true,
      time_24hr: true,
      minuteIncrement: 1,
      dateFormat: "d/m/Y H:i",
      ariaDateFormat: "j F Y",
      locale: locale === "th" ? Thai : english,
      disableMobile: true,
      allowInput: false,
      clickOpens: !readOnly,
      prevArrow: "‹",
      nextArrow: "›",
      onChange: (dates, _text, instance) => {
        if (readOnly) return;
        onChangeRef.current(
          dates[0]
            ? fromBangkokInput(instance.formatDate(dates[0], "Y-m-d\\TH:i"))
            : null,
        );
      },
    });
    picker.calendarContainer.classList.add("event-datetime-calendar");
    pickerRef.current = picker;
    return () => {
      picker.destroy();
      pickerRef.current = null;
    };
  }, [locale, readOnly]);

  useEffect(() => {
    const picker = pickerRef.current;
    if (!picker) return;
    const wallTime = toBangkokInput(value);
    const selected = picker.selectedDates[0];
    const current = selected ? picker.formatDate(selected, "Y-m-d\\TH:i") : "";
    if (wallTime === current) return;
    // These Date objects hold Bangkok wall-clock fields, not the actual instant.
    // Convert back with +07:00 on selection so the browser timezone cannot shift it.
    picker.setDate(wallTime ? new Date(wallTime) : [], false);
  }, [value, locale, readOnly]);

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          readOnly
          aria-readonly={readOnly}
          aria-haspopup={readOnly ? undefined : "dialog"}
          className="h-11 w-full rounded-lg border border-gray-300 bg-event-subtle py-2.5 ps-4 pe-11 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white/90"
        />
        <button
          type="button"
          disabled={readOnly}
          aria-label={label}
          onClick={() => pickerRef.current?.open()}
          className="absolute inset-y-0 end-0 flex w-11 items-center justify-center rounded-e-lg text-event-action focus-visible:ring-2 focus-visible:ring-event-action disabled:cursor-default dark:text-brand-400"
        >
          <CalendarDaysIcon className="size-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
