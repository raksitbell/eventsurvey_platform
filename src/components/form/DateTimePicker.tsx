"use client";

import Label from "@/components/form/Label";
import { scheduleMinuteFloor } from "@/core/event/schedule";
import { fromBangkokInput, toBangkokInput } from "@/core/i18n/bangkok-datetime";
import { CalendarDaysIcon, XMarkIcon } from "@heroicons/react/24/outline";
import flatpickr from "flatpickr";
import type { Instance } from "flatpickr/dist/types/instance";
import "flatpickr/dist/flatpickr.css";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { calendarOptions } from "./calendar-options";

interface DateTimePickerProps {
  id: string;
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  readOnly?: boolean;
  placeholder?: string;
  dateOnly?: boolean;
  blockPast?: boolean;
  min?: string | null;
  max?: string | null;
  range?: { start: string | null; end: string | null };
  clearLabel?: string;
  onFocus?: () => void;
}

const hours = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0"));
const minutes = Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, "0"));
const clockClass =
  "h-8 rounded border border-gray-300 bg-white px-1 text-sm tabular-nums text-gray-800 focus-visible:ring-2 focus-visible:ring-event-action dark:border-gray-600 dark:bg-gray-800 dark:text-white/90";

function calendarDate(day: string) {
  // Flatpickr reads local calendar days. Clock values are converted separately.
  return day ? new Date(day + "T12:00:00") : undefined;
}

function formatWallTime(value: string) {
  if (!value) return "";
  const [day, time] = value.split("T");
  return [day.split("-").reverse().join("/"), time].filter(Boolean).join(" ");
}

function clockLimits(day: string, lower: string, upper: string) {
  return {
    earliest: lower.slice(0, 10) === day ? lower.slice(11) || "00:00" : "00:00",
    latest: upper.slice(0, 10) === day ? upper.slice(11) || "23:59" : "23:59",
  };
}

function scheduleBounds(
  min: string | null,
  max: string | null,
  blockPast: boolean,
  dateOnly: boolean,
  now: number,
) {
  const length = dateOnly ? 10 : 16;
  const current = blockPast ? toBangkokInput(new Date(now).toISOString()).slice(0, length) : "";
  const lower = toBangkokInput(min).slice(0, length);
  const upper = toBangkokInput(max).slice(0, length);
  return {
    lower: current > lower ? current : lower,
    // An expired end must not prevent repair of a historical schedule.
    upper: upper && upper >= current ? upper : "",
    current,
  };
}

export default function DateTimePicker({
  id,
  label,
  value,
  onChange,
  readOnly = false,
  placeholder,
  dateOnly = false,
  blockPast = false,
  min = null,
  max = null,
  range,
  clearLabel,
  onFocus,
}: DateTimePickerProps) {
  const locale = useLocale();
  const t = useTranslations("datePicker");
  const [now, setNow] = useState(scheduleMinuteFloor);
  const [footer, setFooter] = useState<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<Instance | null>(null);

  const wallTime = toBangkokInput(value).slice(0, dateOnly ? 10 : 16);
  const day = wallTime.slice(0, 10);
  const time = wallTime.slice(11);
  const { lower, upper, current } = scheduleBounds(min, max, blockPast, dateOnly, now);
  const lowerDay = lower.slice(0, 10);
  const upperDay = upper.slice(0, 10);
  const rangeStart = toBangkokInput(range?.start ?? null);
  const rangeEnd = toBangkokInput(range?.end ?? null);
  const { earliest, latest } = clockLimits(day, lower, upper);

  function changeSelection(selectedDay: string, requestedTime: string) {
    const bounds = scheduleBounds(min, max, blockPast, dateOnly, scheduleMinuteFloor());
    if (!selectedDay || selectedDay < bounds.lower.slice(0, 10) ||
        (bounds.upper && selectedDay > bounds.upper.slice(0, 10))) return;
    const { earliest, latest } = clockLimits(selectedDay, bounds.lower, bounds.upper);
    if (earliest > latest) return;
    const selectedTime = requestedTime < earliest ? earliest : requestedTime > latest ? latest : requestedTime;
    const next = fromBangkokInput(selectedDay + "T" + (dateOnly ? "00:00" : selectedTime));
    if (next) onChange(next);
  }

  const onDaySelect = useEffectEvent((selectedDay: string, input: HTMLInputElement) => {
    if (selectedDay) changeSelection(selectedDay, time || "12:00");
    else onChange(null);
    input.value = formatWallTime(wallTime);
  });
  const decorateDay = useEffectEvent((cell: HTMLElement, cellDay: string) => {
    if (!rangeStart || !rangeEnd || rangeEnd < rangeStart || (!dateOnly && rangeEnd === rangeStart)) return;
    const start = rangeStart.slice(0, 10);
    const end = rangeEnd.slice(0, 10);
    if (cellDay < start || cellDay > end) return;

    const dayLabel = cell.getAttribute("aria-label") ?? "";
    if (cellDay === start) cell.classList.add("schedule-range-start");
    if (cellDay === end) cell.classList.add("schedule-range-end");
    if (cellDay > start && cellDay < end) cell.classList.add("schedule-range-between");
    if (cellDay === start && cellDay === end) {
      cell.setAttribute("aria-label", t("rangeBoth", { day: dayLabel }));
    } else if (cellDay === start || cellDay === end) {
      cell.setAttribute("aria-label", t(cellDay === start ? "rangeStart" : "rangeEnd", { day: dayLabel }));
    }
  });

  useEffect(() => {
    if (!blockPast || readOnly) return;
    const refresh = () => setNow(scheduleMinuteFloor());
    const timer = globalThis.window.setInterval(refresh, 1000);
    globalThis.window.addEventListener("focus", refresh);
    return () => {
      globalThis.window.clearInterval(timer);
      globalThis.window.removeEventListener("focus", refresh);
    };
  }, [blockPast, readOnly]);

  useEffect(() => {
    if (!inputRef.current || readOnly) return;
    const picker = flatpickr(inputRef.current, {
      ...calendarOptions(locale),
      dateFormat: "d/m/Y",
      now: calendarDate(toBangkokInput(new Date().toISOString()).slice(0, 10)),
      closeOnSelect: dateOnly,
      onReady: (_dates, _text, instance) => {
        const calendar = instance.calendarContainer;
        calendar.id = id + "-calendar";
        calendar.classList.add("event-datetime-calendar");
        calendar.setAttribute("role", "dialog");
        const calendarFooter = globalThis.document.createElement("div");
        calendar.append(calendarFooter);
        setFooter(calendarFooter);
      },
      onOpen: () => {
        setNow(scheduleMinuteFloor());
        setOpen(true);
      },
      onClose: () => setOpen(false),
      onChange: ([date], _text, instance) => {
        onDaySelect(date ? instance.formatDate(date, "Y-m-d") : "", instance.input);
      },
      onDayCreate: (_dates, _text, instance, cell) => {
        const cellDay = instance.formatDate(cell.dateObj, "Y-m-d");
        if (cell.classList.contains("flatpickr-disabled")) cell.setAttribute("aria-disabled", "true");
        if (cell.classList.contains("today")) cell.setAttribute("aria-current", "date");
        decorateDay(cell, cellDay);
      },
    });
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape" || !picker.isOpen) return;
      event.preventDefault();
      event.stopPropagation();
      picker.input.focus({ preventScroll: true });
      picker.close();
    }
    picker.input.addEventListener("keydown", closeOnEscape, { capture: true });
    picker.calendarContainer.addEventListener("keydown", closeOnEscape, { capture: true });
    pickerRef.current = picker;
    return () => {
      picker.input.removeEventListener("keydown", closeOnEscape, true);
      picker.calendarContainer.removeEventListener("keydown", closeOnEscape, true);
      picker.destroy();
      pickerRef.current = null;
    };
  }, [dateOnly, id, locale, readOnly]);

  useEffect(() => {
    const picker = pickerRef.current;
    if (!picker) return;
    picker.calendarContainer.setAttribute("aria-label", label);
    picker.set({ minDate: calendarDate(lowerDay), maxDate: calendarDate(upperDay) });
    picker.setDate(calendarDate(day) ?? [], false);
  }, [dateOnly, day, id, label, locale, lowerDay, readOnly, upperDay]);

  useEffect(() => {
    pickerRef.current?.redraw();
  }, [dateOnly, rangeStart, rangeEnd]);

  useEffect(() => {
    if (inputRef.current) inputRef.current.value = formatWallTime(wallTime);
  }, [dateOnly, id, locale, lowerDay, readOnly, upperDay, wallTime]);

  const error = readOnly || !wallTime ? null
    : current && wallTime < current ? t("pastDate")
    : lower && wallTime < lower ? t(dateOnly ? "minDate" : "minDateTime", { value: formatWallTime(lower) })
    : upper && wallTime > upper ? t(dateOnly ? "maxDate" : "maxDateTime", { value: formatWallTime(upper) })
    : null;
  const notice = lower > current
    ? t(dateOnly ? "minDate" : "minDateTime", { value: formatWallTime(lower) })
    : blockPast ? t(dateOnly ? "pastDay" : "pastDate") : null;
  const endNotice = upper
    ? t(dateOnly ? "maxDate" : "maxDateTime", { value: formatWallTime(upper) })
    : null;
  const [hour, minute] = time.split(":");
  const clockEnabled = !!day && (!lowerDay || day >= lowerDay) && (!upperDay || day <= upperDay) && earliest <= latest;
  const firstHour = earliest.slice(0, 2);
  const lastHour = latest.slice(0, 2);

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
          defaultValue={formatWallTime(wallTime)}
          aria-readonly={readOnly}
          aria-haspopup={readOnly ? undefined : "dialog"}
          aria-expanded={readOnly ? undefined : open}
          aria-controls={readOnly ? undefined : id + "-calendar"}
          aria-invalid={!!error}
          aria-describedby={error ? id + "-error" : undefined}
          onFocus={onFocus}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !readOnly) event.preventDefault();
          }}
          className={`h-11 w-full rounded-lg border bg-event-subtle py-2.5 ps-4 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden aria-invalid:border-error-500 dark:bg-gray-800 dark:text-white/90 dark:aria-invalid:border-error-400 ${error ? "border-error-500 dark:border-error-400" : "border-gray-300 dark:border-gray-700"} ${clearLabel ? "pe-20" : "pe-11"}`}
        />
        {!readOnly && clearLabel && value && (
          <button
            type="button"
            aria-label={clearLabel}
            onClick={() => onChange(null)}
            className="absolute inset-y-0 end-11 flex w-8 items-center justify-center rounded text-gray-500 focus-visible:ring-2 focus-visible:ring-event-action dark:text-gray-400"
          >
            <XMarkIcon className="size-4" aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          disabled={readOnly}
          aria-label={label}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={readOnly ? undefined : id + "-calendar"}
          onClick={() => {
            inputRef.current?.focus();
            pickerRef.current?.open();
          }}
          className="absolute inset-y-0 end-0 flex w-11 items-center justify-center rounded-e-lg text-event-action focus-visible:ring-2 focus-visible:ring-event-action disabled:cursor-default dark:text-brand-400"
        >
          <CalendarDaysIcon className="size-5" aria-hidden="true" />
        </button>
      </div>
      {error && <p id={id + "-error"} className="mt-1.5 text-xs font-medium text-error-600 dark:text-error-400" role="alert">{error}</p>}
      {footer && !readOnly && createPortal(
        <>
          {!dateOnly && (
            <div
              dir="ltr"
              onKeyDown={(event) => {
                if (event.target instanceof HTMLSelectElement && event.key !== "Tab") event.stopPropagation();
              }}
              className="flex items-center justify-center gap-2 border-t border-gray-200 pt-2 tabular-nums text-gray-800 dark:border-gray-700 dark:text-gray-100"
            >
              <select
                aria-label={t("hour", { label })}
                className={clockClass}
                disabled={!clockEnabled}
                value={hour ?? ""}
                onChange={(event) => changeSelection(day, event.target.value + ":" + minute)}
              >
                {!hour && <option value="">--</option>}
                {hours.map((option) => (
                  <option key={option} disabled={option < firstHour || option > lastHour}>{option}</option>
                ))}
              </select>
              <span aria-hidden="true">:</span>
              <select
                aria-label={t("minute", { label })}
                className={clockClass}
                disabled={!clockEnabled}
                value={minute ?? ""}
                onChange={(event) => changeSelection(day, hour + ":" + event.target.value)}
              >
                {!minute && <option value="">--</option>}
                {minutes.map((option) => (
                  <option key={option} disabled={hour + ":" + option < earliest || hour + ":" + option > latest}>{option}</option>
                ))}
              </select>
            </div>
          )}
          {(notice || endNotice) && (
            <p className="mt-2 max-w-76 text-xs text-gray-600 dark:text-gray-300">
              {[notice, endNotice].filter(Boolean).join(" ")}
            </p>
          )}
        </>,
        footer,
      )}
    </div>
  );
}
