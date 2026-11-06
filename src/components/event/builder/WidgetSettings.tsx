"use client";

import React, { useEffect } from "react";
import { useTranslations } from "next-intl";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import Label from "@/components/form/Label";
import {
  Bars3BottomLeftIcon,
  Bars3BottomRightIcon,
  Bars3Icon,
  CalendarDaysIcon,
  ChartBarIcon,
  ChartPieIcon,
  PresentationChartLineIcon,
} from "@heroicons/react/24/outline";
import { WidgetTypeIcon } from "./WidgetPreview";
import type { DashboardWidget, ReportingData } from "@/types/event/reporting";

const ALIGN_OPTIONS: {
  value: NonNullable<DashboardWidget["text_align"]>;
  labelKey: "alignLeft" | "alignCenter" | "alignRight";
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: "left", labelKey: "alignLeft", Icon: Bars3BottomLeftIcon },
  { value: "center", labelKey: "alignCenter", Icon: Bars3Icon },
  { value: "right", labelKey: "alignRight", Icon: Bars3BottomRightIcon },
];

interface Props {
  widget: DashboardWidget;
  data: ReportingData;
  disabled?: boolean;
  change: (patch: Partial<DashboardWidget>) => void;
  onClose?: () => void;
}

export default function WidgetSettings({
  widget,
  data,
  disabled = false,
  change,
  onClose,
}: Props) {
  const t = useTranslations("eventReports");

  useEffect(() => {
    if (!onClose) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    globalThis.document.addEventListener("keydown", handleKeyDown);
    return () => {
      globalThis.document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const eventStartDate = data.eventStartsAt
    ? data.eventStartsAt.slice(0, 10)
    : "";
  const eventEndDate = data.eventEndsAt ? data.eventEndsAt.slice(0, 10) : "";
  const effectiveFrom = widget.date_from ?? eventStartDate;
  const effectiveTo = widget.date_to ?? eventEndDate;
  const hasCustomDates = Boolean(widget.date_from || widget.date_to);
  const align = widget.text_align ?? "left";

  return (
    <div className="space-y-4">
      {/* Drawer Header + Content Alignment Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3 dark:border-gray-800">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
            <WidgetTypeIcon widget={widget} className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-gray-900 dark:text-white">
              {t("builder.settings")}
            </h2>
            <p className="truncate text-theme-sm text-gray-500 dark:text-gray-400">
              {widget.title || t(`builder.${widget.widget_type}`)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 3-Way Content Alignment (Left | Center | Right for body content/chart only) */}
          <div
            role="group"
            aria-label="Content alignment"
            className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-100/90 p-1 dark:border-gray-700 dark:bg-gray-800"
          >
            {ALIGN_OPTIONS.map(({ value, labelKey, Icon }) => {
              const isActive = align === value;
              const label = t(`builder.${labelKey}`);
              return (
                <button
                  key={value}
                  type="button"
                  disabled={disabled}
                  title={label}
                  aria-label={label}
                  aria-pressed={isActive}
                  onClick={() => change({ text_align: value })}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-theme-sm font-medium transition ${
                    isActive
                      ? "bg-white text-brand-600 shadow-theme-xs dark:bg-gray-900 dark:text-brand-400"
                      : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  <Icon className="size-4" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Form Grid */}
      <fieldset disabled={disabled} className="grid gap-3.5 sm:grid-cols-2">
        {/* 1. Widget Title */}
        <div>
          <Label htmlFor="widget-title">{t("builder.widgetTitle")}</Label>
          <Input
            id="widget-title"
            maxLength={240}
            value={widget.title}
            onChange={(e) => change({ title: e.target.value })}
          />
        </div>

        {/* 2. Data Source Form */}
        <div>
          <Label htmlFor="widget-source">{t("builder.source")}</Label>
          <Select
            id="widget-source"
            value={widget.source_form_id ?? ""}
            onChange={(e) =>
              change({
                source_form_id: e.target.value || null,
                source_field_id: null,
                aggregation: "count",
              })
            }
          >
            <option value="">{t("builder.allForms")}</option>
            {data.forms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.title}
              </option>
            ))}
          </Select>
        </div>

        {/* 3. Data Field */}
        <div>
          <Label htmlFor="widget-field">{t("builder.field")}</Label>
          <Select
            id="widget-field"
            value={widget.source_field_id ?? ""}
            onChange={(e) =>
              change({
                source_field_id: e.target.value || null,
                aggregation: "count",
              })
            }
          >
            <option value="">{t("builder.none")}</option>
            {data.fields
              .filter((f) => f.formId === widget.source_form_id)
              .map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
          </Select>
        </div>

        {/* 4. Chart Type / Aggregation / Comparison Mode */}
        {widget.widget_type === "chart" ? (
          <div>
            <Label>{t("builder.display")}</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {(["line", "bar", "pie", "donut"] as const).map((k) => {
                const isActive = (widget.chart_type ?? "line") === k;
                const CIcon =
                  k === "bar"
                    ? ChartBarIcon
                    : k === "pie" || k === "donut"
                      ? ChartPieIcon
                      : PresentationChartLineIcon;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() =>
                      change({
                        chart_type: k,
                        aggregation: "count",
                      })
                    }
                    className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-theme-sm font-medium transition ${
                      isActive
                        ? "border-brand-500 bg-brand-50 text-brand-600 dark:border-brand-400 dark:bg-brand-500/20 dark:text-brand-300"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                  >
                    <CIcon className="size-4 shrink-0" />
                    <span className="truncate">{t(`builder.${k}`)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : widget.widget_type === "number" ? (
          <div>
            <Label htmlFor="widget-aggregation">
              {t("builder.aggregation")}
            </Label>
            <Select
              id="widget-aggregation"
              value={widget.aggregation}
              onChange={(e) =>
                change({
                  aggregation: e.target
                    .value as DashboardWidget["aggregation"],
                })
              }
            >
              {[
                "count",
                ...(data.fields.some(
                  (f) => f.id === widget.source_field_id && f.numeric,
                )
                  ? ["sum", "average", "minimum", "maximum", "percentage"]
                  : []),
              ].map((k) => (
                <option key={k} value={k}>
                  {t(`builder.${k}`)}
                </option>
              ))}
            </Select>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="widget-comparison">
                {t("builder.comparison")}
              </Label>
              <Select
                id="widget-comparison"
                value={widget.comparison_mode ?? "target"}
                onChange={(e) =>
                  change({
                    comparison_mode: e.target
                      .value as DashboardWidget["comparison_mode"],
                    aggregation: "count",
                  })
                }
              >
                {["target", "capacity", "previous_period"].map((k) => (
                  <option key={k} value={k}>
                    {t(`builder.${k}`)}
                  </option>
                ))}
              </Select>
            </div>
            {widget.comparison_mode !== "previous_period" && (
              <div>
                <Label htmlFor="widget-target">{t("builder.target")}</Label>
                <Input
                  id="widget-target"
                  type="number"
                  min={1}
                  value={widget.target_value ?? ""}
                  onChange={(e) =>
                    change({
                      target_value: e.target.value
                        ? Number(e.target.value)
                        : null,
                    })
                  }
                />
              </div>
            )}
          </div>
        )}
      </fieldset>

      {/* Row 2: Event Date Range Bar (referencing event starts_at and ends_at) */}
      <fieldset
        disabled={disabled}
        className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-gray-100 bg-gray-50/70 px-3.5 py-2.5 dark:border-gray-800 dark:bg-gray-800/50"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-theme-sm font-medium text-gray-700 dark:text-gray-200">
            <CalendarDaysIcon className="size-4 text-brand-600 dark:text-brand-400" />
            <span>{t("builder.range")}:</span>
          </span>

          <div className="inline-flex flex-wrap items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2.5 py-1 text-theme-sm dark:border-gray-700 dark:bg-gray-900">
            <span className="text-gray-400">{t("builder.dateFrom")}</span>
            <input
              type="date"
              aria-label={t("builder.dateFrom")}
              min={eventStartDate || undefined}
              max={effectiveTo || eventEndDate || undefined}
              value={effectiveFrom}
              onChange={(e) =>
                change({
                  date_from: e.target.value || null,
                  date_range_days: 0,
                })
              }
              className="bg-transparent font-medium text-gray-800 outline-hidden dark:text-gray-200"
            />
            <span className="text-gray-300 dark:text-gray-600">–</span>
            <span className="text-gray-400">{t("builder.dateTo")}</span>
            <input
              type="date"
              aria-label={t("builder.dateTo")}
              min={effectiveFrom || eventStartDate || undefined}
              max={eventEndDate || undefined}
              value={effectiveTo}
              onChange={(e) =>
                change({
                  date_to: e.target.value || null,
                  date_range_days: 0,
                })
              }
              className="bg-transparent font-medium text-gray-800 outline-hidden dark:text-gray-200"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() =>
              change({
                date_from: eventStartDate || null,
                date_to: eventEndDate || null,
                date_range_days: 0,
              })
            }
            className={`rounded-lg px-2.5 py-1 text-theme-sm font-medium transition ${
              !widget.date_range_days &&
              (!hasCustomDates ||
                (widget.date_from === eventStartDate &&
                  widget.date_to === eventEndDate))
                ? "bg-brand-500 text-white shadow-theme-xs"
                : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            }`}
          >
            {t("builder.eventPeriod")}
          </button>

          {[7, 30, 90].map((days) => {
            const isActive = widget.date_range_days === days;
            return (
              <button
                key={days}
                type="button"
                onClick={() =>
                  change({
                    date_range_days: days,
                    date_from: null,
                    date_to: null,
                  })
                }
                className={`rounded-lg px-2.5 py-1 text-theme-sm font-medium transition ${
                  isActive
                    ? "bg-brand-500 text-white shadow-theme-xs"
                    : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                }`}
              >
                {t("builder.lastDays", { count: days })}
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
