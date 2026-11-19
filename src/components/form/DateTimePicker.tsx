"use client";

import Label from "@/components/form/Label";
import { fromBangkokInput, toBangkokInput } from "@/core/i18n/bangkok-datetime";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import flatpickr from "flatpickr";
import { Thai } from "flatpickr/dist/l10n/th";
import { english } from "flatpickr/dist/l10n/default";
import type { Instance } from "flatpickr/dist/types/instance";
import "flatpickr/dist/flatpickr.css";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

interface DateTimePickerProps {
  id: string;
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  readOnly?: boolean;
  placeholder?: string;
  dateOnly?: boolean;
}

const hourOptions = Array.from({ length: 24 }, (_, hour) =>
  String(hour).padStart(2, "0"),
);
const minuteOptions = Array.from({ length: 60 }, (_, minute) =>
  String(minute).padStart(2, "0"),
);

const clockSelectClass =
  "h-8 appearance-none rounded bg-transparent bg-none p-1 text-sm tabular-nums text-inherit focus-visible:ring-2 focus-visible:ring-event-action dark:text-white/90 dark:*:bg-gray-800";

/** TailAdmin Flatpickr selects the day. Clock fields are Bangkok wall time. */
export default function DateTimePicker({
  id,
  label,
  value,
  onChange,
  readOnly = false,
  placeholder,
  dateOnly = false,
}: DateTimePickerProps) {
  const locale = useLocale();
  const t = useTranslations("eventSetupDesign");
  const wallTime = toBangkokInput(value);
  const day = wallTime.slice(0, 10);
  const time = wallTime.slice(11);
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<Instance | null>(null);
  const onDayChange = useRef<(day: string) => void>(null);
  useEffect(() => {
    onDayChange.current = (selectedDay) => {
      onChange(
        selectedDay
          ? fromBangkokInput(`${selectedDay}T${dateOnly ? "00:00" : time || "12:00"}`)
          : null,
      );
    };
  }, [dateOnly, onChange, time]);

  useEffect(() => {
    if (!inputRef.current) return;
    const picker = flatpickr(inputRef.current, {
      dateFormat: "d/m/Y",
      ariaDateFormat: "j F Y",
      locale: locale === "th" ? Thai : english,
      disableMobile: true,
      allowInput: false,
      clickOpens: !readOnly,
      prevArrow: "‹",
      nextArrow: "›",
      onChange: ([date], _text, instance) => {
        if (!readOnly) {
          onDayChange.current?.(date ? instance.formatDate(date, "Y-m-d") : "");
        }
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
    // Flatpickr uses local calendar dates. Use noon only as a calendar marker;
    // the selected event time is never interpreted as a browser-local Date.
    picker.setDate(day ? new Date(`${day}T12:00:00`) : [], false);
    if (day) {
      const [year, month, date] = day.split("-");
      picker.input.value = `${date}/${month}/${year}`;
    }
  }, [day, locale, readOnly]);

  const [hour, minute] = time.split(":");
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <input
          ref={inputRef}
          placeholder={placeholder}
          id={id}
          type="text"
          readOnly
          aria-readonly={readOnly}
          aria-haspopup={readOnly ? undefined : "dialog"}
          className={`h-11 w-full rounded-lg border border-gray-300 bg-event-subtle py-2.5 ps-4 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white/90 ${!dateOnly && day ? "pe-28" : "pe-11"}`}
        />
        {!dateOnly && day && (
          <div
            className="absolute inset-y-0 end-11 flex items-center text-sm text-gray-800 dark:text-white/90"
            dir="ltr"
          >
            {readOnly ? (
              <span>{time}</span>
            ) : (
              <>
                <select
                  aria-label={t("eventHour", { label })}
                  className={clockSelectClass}
                  value={hour}
                  onChange={(event) =>
                    onChange(fromBangkokInput(`${day}T${event.target.value}:${minute}`))
                  }
                >
                  {hourOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
                <span aria-hidden="true">:</span>
                <select
                  aria-label={t("eventMinute", { label })}
                  className={clockSelectClass}
                  value={minute}
                  onChange={(event) =>
                    onChange(fromBangkokInput(`${day}T${hour}:${event.target.value}`))
                  }
                >
                  {minuteOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </>
            )}
          </div>
        )}
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
