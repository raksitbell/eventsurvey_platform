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
  savedValue?: string | null;
  showBoundsHint?: boolean;
  validationError?: string | null;
  min?: string | null;
  max?: string | null;
  range?: { start: string | null; end: string | null };
  clearLabel?: string;
  onFocus?: () => void;
  popover?: {
    displayValue?: string;
    cancelLabel: string;
    preset: { label: string; onSelect: () => void };
    actionsClassName?: string;
    onDismiss: (discardSelection: boolean) => void;
  };
}

function ClockInput({ label, value, other, max, disabled, onChange }: {
  label: string;
  value: string;
  other: string;
  max: number;
  disabled: boolean;
  onChange: (part: string, other: string) => void;
}) {
  const [typed, setTyped] = useState<string | null>(null);
  // A partial hour can hit a schedule bound. Keep the minute the user started with.
  const originalOther = useRef(other);
  return (
    <input
      type="text"
      inputMode="numeric"
      maxLength={2}
      placeholder="--"
      aria-label={label}
      disabled={disabled}
      value={typed ?? value}
      className="h-8 w-12 rounded border border-gray-300 bg-white px-1 text-center text-sm tabular-nums text-gray-800 focus-visible:ring-2 focus-visible:ring-event-action dark:border-gray-600 dark:bg-gray-800 dark:text-white/90"
      onFocus={(event) => {
        originalOther.current = other;
        event.currentTarget.select();
      }}
      onChange={(event) => {
        const digits = event.currentTarget.value;
        if (!/^\d{0,2}$/.test(digits)) return;
        setTyped(digits.length === 2 ? null : digits);
        if (digits) {
          const part = Math.min(Number(digits), max).toString().padStart(2, "0");
          onChange(part, originalOther.current);
        }
      }}
      onBlur={() => setTyped(null)}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Enter") {
          event.preventDefault();
          setTyped(null);
          event.currentTarget.select();
        }
      }}
    />
  );
}

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

function positionPopover(picker: Instance, anchor = picker.config.positionElement) {
  if (!anchor) return;
  const { calendarContainer } = picker;
  const bounds = anchor.getBoundingClientRect();
  const viewport = globalThis.document.documentElement;
  const gutter = 8;
  const gap = 6;
  const width = calendarContainer.offsetWidth;
  const rtl = globalThis.window.getComputedStyle(anchor).direction === "rtl";
  const inlineEnd = rtl ? bounds.left : bounds.right - width;
  const left = Math.max(gutter, Math.min(inlineEnd, viewport.clientWidth - width - gutter));
  const above = bounds.top - gap - gutter;
  const below = viewport.clientHeight - bounds.bottom - gap - gutter;

  const borders = calendarContainer.offsetHeight - calendarContainer.clientHeight;
  const naturalHeight = calendarContainer.scrollHeight + borders;
  const placeAbove = above >= naturalHeight || above > below;
  const maxHeight = Math.max(0, placeAbove ? above : below);
  calendarContainer.style.maxHeight = `${maxHeight}px`;
  calendarContainer.style.left = `${left}px`;
  calendarContainer.style.top = `${placeAbove ? bounds.top - gap - calendarContainer.offsetHeight : bounds.bottom + gap}px`;
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
  savedValue,
  showBoundsHint = true,
  validationError,
  min = null,
  max = null,
  range,
  clearLabel,
  onFocus,
  popover,
}: DateTimePickerProps) {
  const locale = useLocale();
  const t = useTranslations("datePicker");
  const [now, setNow] = useState(scheduleMinuteFloor);
  const [footer, setFooter] = useState<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<Instance | null>(null);
  const discardSelectionRef = useRef(false);
  const isPopover = !!popover;

  const wallTime = toBangkokInput(value).slice(0, dateOnly ? 10 : 16);
  const popoverDisplayValue = popover?.displayValue ?? formatWallTime(wallTime);
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
  const dismissPopover = useEffectEvent(() => {
    popover?.onDismiss(discardSelectionRef.current);
    discardSelectionRef.current = false;
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
    const trigger = triggerRef.current;
    const picker = flatpickr(inputRef.current, {
      ...calendarOptions(locale),
      dateFormat: "d/m/Y",
      now: calendarDate(toBangkokInput(new Date().toISOString()).slice(0, 10)),
      closeOnSelect: dateOnly,
      ...(isPopover && trigger ? {
        appendTo: popoverRef.current ?? undefined,
        clickOpens: false,
        ignoredFocusElements: [trigger],
        position: positionPopover,
        positionElement: trigger,
      } : {}),
      onReady: (_dates, _text, instance) => {
        const calendar = instance.calendarContainer;
        calendar.id = id + "-calendar";
        calendar.classList.add("event-datetime-calendar");
        if (isPopover) calendar.classList.add("event-datetime-popover");
        calendar.setAttribute("role", "dialog");
        const calendarFooter = globalThis.document.createElement("div");
        calendar.append(calendarFooter);
        setFooter(calendarFooter);
      },
      onOpen: (_dates, _text, instance) => {
        setNow(scheduleMinuteFloor());
        setOpen(true);
        if (isPopover) {
          const calendar = instance.calendarContainer;
          const day = calendar.querySelector<HTMLElement>(".flatpickr-day.selected:not(.flatpickr-disabled)")
            ?? calendar.querySelector<HTMLElement>(".flatpickr-day:not(.flatpickr-disabled, .prevMonthDay, .nextMonthDay)");
          (day ?? calendar).focus({ preventScroll: true });
        }
      },
      onClose: () => {
        setOpen(false);
        dismissPopover();
      },
      onChange: ([date], _text, instance) => {
        onDaySelect(date ? instance.formatDate(date, "Y-m-d") : "", instance.input);
      },
      onDayCreate: (_dates, _text, instance, cell) => {
        const cellDay = instance.formatDate(cell.dateObj, "Y-m-d");
        if (cell.classList.contains("today")) cell.setAttribute("aria-current", "date");
        if (cell.classList.contains("flatpickr-disabled")) {
          cell.setAttribute("aria-disabled", "true");
          return;
        }
        decorateDay(cell, cellDay);
      },
    });
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape" || !picker.isOpen) return;
      event.preventDefault();
      event.stopPropagation();
      discardSelectionRef.current = isPopover;
      (trigger ?? picker.input).focus({ preventScroll: true });
      picker.close();
    }
    function returnToTrigger(event: KeyboardEvent) {
      if (event.key !== "Tab" || !event.shiftKey || !(event.target instanceof HTMLElement)
          || !event.target.classList.contains("flatpickr-day")) return;
      event.preventDefault();
      event.stopPropagation();
      trigger?.focus({ preventScroll: true });
    }
    picker.input.addEventListener("keydown", closeOnEscape, { capture: true });
    picker.calendarContainer.addEventListener("keydown", closeOnEscape, { capture: true });
    trigger?.addEventListener("keydown", closeOnEscape, { capture: true });
    if (isPopover) picker.calendarContainer.addEventListener("keydown", returnToTrigger, { capture: true });
    pickerRef.current = picker;
    return () => {
      picker.input.removeEventListener("keydown", closeOnEscape, true);
      picker.calendarContainer.removeEventListener("keydown", closeOnEscape, true);
      trigger?.removeEventListener("keydown", closeOnEscape, true);
      picker.calendarContainer.removeEventListener("keydown", returnToTrigger, true);
      if (isPopover && picker.isOpen) {
        discardSelectionRef.current = true;
        picker.close();
      }
      picker.destroy();
      pickerRef.current = null;
    };
  }, [dateOnly, id, isPopover, locale, readOnly]);

  useEffect(() => {
    if (!open || !isPopover) return;
    const trigger = triggerRef.current;
    const picker = pickerRef.current;
    if (!trigger || !picker) return;
    const update = (event: Event) => {
      if (event.target instanceof Node && picker.calendarContainer.contains(event.target)) return;
      const bounds = trigger.getBoundingClientRect();
      if (bounds.bottom <= 0 || bounds.top >= globalThis.document.documentElement.clientHeight) {
        picker.close();
        return;
      }
      positionPopover(picker, trigger);
    };
    globalThis.document.addEventListener("scroll", update, { capture: true, passive: true });
    return () => globalThis.document.removeEventListener("scroll", update, true);
  }, [isPopover, open]);

  useEffect(() => {
    const picker = pickerRef.current;
    if (!picker) return;
    picker.calendarContainer.setAttribute("aria-label", label);
    picker.set({ minDate: calendarDate(lowerDay), maxDate: calendarDate(upperDay) });
  }, [dateOnly, id, isPopover, label, locale, lowerDay, readOnly, upperDay]);

  useEffect(() => {
    const picker = pickerRef.current;
    if (!picker) return;
    const selected = picker.selectedDates[0];
    if (isPopover && selected && picker.formatDate(selected, "Y-m-d") === day) return;
    picker.setDate(calendarDate(day) ?? [], false);
  }, [dateOnly, day, id, isPopover, label, locale, lowerDay, readOnly, upperDay]);

  useEffect(() => {
    pickerRef.current?.redraw();
  }, [dateOnly, rangeStart, rangeEnd]);

  useEffect(() => {
    if (inputRef.current) inputRef.current.value = formatWallTime(wallTime);
  }, [dateOnly, id, locale, lowerDay, readOnly, upperDay, wallTime]);

  // A saved time may have elapsed since the last visit. New selections still use the current bounds.
  const valueBounds = blockPast && value && savedValue && Date.parse(value) === Date.parse(savedValue)
    ? scheduleBounds(min, max, false, dateOnly, now)
    : { current, lower, upper };
  const error = validationError ?? (readOnly || !wallTime ? null
    : valueBounds.current && wallTime < valueBounds.current ? t("pastDate")
    : valueBounds.lower && wallTime < valueBounds.lower ? t(dateOnly ? "minDate" : "minDateTime", { value: formatWallTime(valueBounds.lower) })
    : valueBounds.upper && wallTime > valueBounds.upper ? t(dateOnly ? "maxDate" : "maxDateTime", { value: formatWallTime(valueBounds.upper) })
    : null);
  const notice = lower > current
    ? t(dateOnly ? "minDate" : "minDateTime", { value: formatWallTime(lower) })
    : blockPast ? t(dateOnly ? "pastDay" : "pastDate") : null;
  const endNotice = upper
    ? t(dateOnly ? "maxDate" : "maxDateTime", { value: formatWallTime(upper) })
    : null;
  const [hour, minute] = time.split(":");
  const clockEnabled = !!day && (!lowerDay || day >= lowerDay) && (!upperDay || day <= upperDay) && earliest <= latest;

  function discardPopoverSelection() {
    discardSelectionRef.current = true;
    triggerRef.current?.focus({ preventScroll: true });
    pickerRef.current?.close();
  }

  return (
    <div ref={popoverRef} onBlur={isPopover ? (event) => {
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget) && pickerRef.current?.isOpen)
        pickerRef.current.close();
    } : undefined}>
      <Label htmlFor={id}>{label}</Label>
      {popover ? (
        <>
          <input ref={inputRef} className="hidden" tabIndex={-1} aria-hidden="true" />
          <button
            id={id}
            type="button"
            ref={triggerRef}
            className="event-datetime-popover-trigger"
            disabled={readOnly}
            aria-label={`${label}, ${popoverDisplayValue}`}
            aria-haspopup="dialog"
            aria-describedby={validationError ? id + "-error" : undefined}
            aria-expanded={!readOnly && open}
            aria-controls={readOnly ? undefined : id + "-calendar"}
            onClick={() => {
              const picker = pickerRef.current;
              if (picker?.isOpen) picker.close();
              else picker?.open();
            }}
          >
            {popoverDisplayValue}
            <CalendarDaysIcon className="size-4.5 shrink-0" aria-hidden="true" />
          </button>
        </>
      ) : (
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
      )}
      {error && (!popover || validationError) && (
        <p id={id + "-error"} className="mt-1.5 text-xs font-medium text-error-600 dark:text-error-400" role="alert">{error}</p>
      )}
      {footer && !readOnly && createPortal(
        <>
          {!dateOnly && (
            <div
              dir="ltr"
              className="event-datetime-clock flex items-center justify-center gap-2 border-t border-gray-200 pt-2 tabular-nums text-gray-800 dark:border-gray-700 dark:text-gray-100"
            >
              <ClockInput
                key={`${day}-${open}-hour`}
                label={t("hour", { label })}
                value={hour ?? ""}
                other={minute ?? "00"}
                max={23}
                disabled={!clockEnabled}
                onChange={(nextHour, originalMinute) => changeSelection(day, nextHour + ":" + originalMinute)}
              />
              <span aria-hidden="true">:</span>
              <ClockInput
                key={`${day}-${open}-minute`}
                label={t("minute", { label })}
                value={minute ?? ""}
                other={hour ?? "00"}
                max={59}
                disabled={!clockEnabled}
                onChange={(nextMinute, originalHour) => changeSelection(day, originalHour + ":" + nextMinute)}
              />
            </div>
          )}
          {(notice || endNotice) && (
            <p className={popover || !showBoundsHint ? "sr-only" : "mt-2 max-w-76 text-xs text-gray-600 dark:text-gray-300"}>
              {[notice, endNotice].filter(Boolean).join(" ")}
            </p>
          )}
          {popover && (
            <div className={popover.actionsClassName}>
              <button type="button" onClick={() => {
                popover.preset.onSelect();
                discardPopoverSelection();
              }}>
                {popover.preset.label}
              </button>
              <button type="button" onClick={discardPopoverSelection}>
                {popover.cancelLabel}
              </button>
            </div>
          )}
        </>,
        footer,
      )}
    </div>
  );
}
