"use client";

import React, { type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "@/context/ThemeContext";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { widgetData } from "@/core/event/widget-data";
import {
  ArrowRightIcon,
  BoltIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ChartPieIcon,
  CircleStackIcon,
  PresentationChartLineIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import type { DashboardWidget, ReportingData } from "@/types/event/reporting";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export function WidgetTypeIcon({
  widget,
  className = "size-4",
}: {
  widget: Pick<DashboardWidget, "widget_type" | "chart_type">;
  className?: string;
}) {
  if (widget.widget_type === "chart") {
    if (widget.chart_type === "bar") {
      return <ChartBarIcon className={className} />;
    }
    if (widget.chart_type === "pie" || widget.chart_type === "donut") {
      return <ChartPieIcon className={className} />;
    }
    return <PresentationChartLineIcon className={className} />;
  }
  if (widget.widget_type === "comparison") {
    return <SparklesIcon className={className} />;
  }
  return <BoltIcon className={className} />;
}

interface Props {
  widget: DashboardWidget;
  data: ReportingData;
  leadingIcon?: ReactNode;
  headerActions?: ReactNode;
}

export default function WidgetPreview({
  widget,
  data,
  leadingIcon,
  headerActions,
}: Props) {
  const t = useTranslations("eventReports");
  const locale = useLocale();
  const { theme } = useTheme();
  const result = widgetData(widget, data);

  const rowSpan = widget.row_span ?? 1;
  const align = widget.text_align ?? "left";
  const chartHeight = rowSpan === 3 ? 420 : rowSpan === 2 ? 290 : 185;
  const valueSizeClass =
    rowSpan === 3
      ? "mt-8 text-title-xl font-bold tracking-tight text-gray-900 dark:text-white"
      : rowSpan === 2
        ? "mt-6 text-title-lg font-bold tracking-tight text-gray-900 dark:text-white"
        : "mt-4 text-title-md font-bold tracking-tight text-gray-900 dark:text-white";

  // Alignment applies ONLY to the displayed body content (chart / metric value), NOT title or legend
  const contentAlignClass =
    align === "center"
      ? "items-center text-center"
      : align === "right"
        ? "items-end text-end"
        : "items-start text-start";

  const chartBoxAlignClass =
    align === "center"
      ? "mx-auto w-full"
      : align === "right"
        ? "ms-auto w-11/12"
        : "me-auto w-11/12";

  const sourceForm = data.forms.find((f) => f.id === widget.source_form_id);
  const sourceField = data.fields.find((f) => f.id === widget.source_field_id);

  const responsesHref = widget.source_form_id
    ? `/event/responses?formId=${encodeURIComponent(widget.source_form_id)}`
    : "/event/responses";

  const eventStartDate = data.eventStartsAt
    ? data.eventStartsAt.slice(0, 10)
    : "";
  const eventEndDate = data.eventEndsAt ? data.eventEndsAt.slice(0, 10) : "";
  const effectiveFrom = widget.date_from ?? eventStartDate;
  const effectiveTo = widget.date_to ?? eventEndDate;

  return (
    <div className="flex h-full flex-col justify-between">
      {/* Header (Always left/start-aligned, unaffected by content alignment) */}
      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            {leadingIcon}
            <span
              title={t(
                `builder.${
                  widget.widget_type === "chart"
                    ? (widget.chart_type ?? "line")
                    : widget.widget_type
                }`,
              )}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              <WidgetTypeIcon widget={widget} className="size-5" />
            </span>

            <h3 className="truncate text-theme-xl font-semibold text-gray-900 dark:text-white">
              {widget.title || t(`builder.${widget.widget_type}`)}
            </h3>
          </div>

          {headerActions}
        </div>

        {/* Source Link + Event Date Range Badge (Always start-aligned) */}
        <div className="flex flex-wrap items-center gap-2 text-theme-sm">
          <Link
            data-no-drag
            href={responsesHref}
            title={t("builder.viewSourceResponses")}
            onClick={(e) => e.stopPropagation()}
            className="pointer-events-auto inline-flex max-w-full items-center gap-1.5 rounded-xl border border-gray-200/80 bg-gray-50/90 px-2.5 py-1 text-theme-sm font-medium text-gray-600 transition hover:border-brand-300 hover:bg-brand-50/70 hover:text-brand-600 dark:border-gray-800 dark:bg-gray-800/70 dark:text-gray-300 dark:hover:border-brand-500/40 dark:hover:text-brand-400"
          >
            <CircleStackIcon className="size-4 shrink-0 text-brand-600 dark:text-brand-400" />
            <span className="truncate">
              {sourceForm?.title ?? t("builder.allForms")}
              {sourceField ? ` · ${sourceField.label}` : ""}
            </span>
            <ArrowRightIcon className="size-3.5 shrink-0 opacity-70" />
          </Link>

          {(effectiveFrom || effectiveTo) && (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-gray-100/80 px-2.5 py-1 text-theme-sm text-gray-500 dark:bg-gray-800/70 dark:text-gray-400">
              <CalendarDaysIcon className="size-4 shrink-0" />
              <span className="tabular-nums">
                {effectiveFrom || "…"} – {effectiveTo || "…"}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Main Content Area (Aligned according to widget.text_align) */}
      {widget.widget_type === "chart" ? (
        result.groups.length ? (
          <div className="mt-3 flex flex-1 flex-col justify-center">
            <div className={`transition-all duration-200 ${chartBoxAlignClass}`}>
              <Chart
                type={widget.chart_type ?? "line"}
                height={chartHeight}
                options={{
                  theme: { mode: theme },
                  chart: {
                    fontFamily: "Outfit, sans-serif",
                    toolbar: { show: false },
                    background: "transparent",
                    animations: { enabled: false },
                  },
                  colors: ["#465fff", "#12b76a", "#f79009"],
                  stroke: { width: 3 },
                  labels: result.groups.map(([k]) => k),
                  xaxis: {
                    categories: result.groups.map(([k]) => k),
                    labels: { style: { fontSize: "14px" } },
                  },
                  yaxis: {
                    labels: { style: { fontSize: "14px" } },
                  },
                  dataLabels: { enabled: false },
                  legend: {
                    show:
                      rowSpan >= 2 ||
                      widget.chart_type === "pie" ||
                      widget.chart_type === "donut",
                    position: "bottom",
                    horizontalAlign: "left",
                    fontSize: "14px",
                  },
                  tooltip: { enabled: true },
                }}
                series={
                  widget.chart_type === "pie" || widget.chart_type === "donut"
                    ? result.groups.map(([, v]) => v)
                    : [
                        {
                          name: t("count"),
                          data: result.groups.map(([, v]) => v),
                        },
                      ]
                }
              />
            </div>
          </div>
        ) : (
          <p className="py-12 text-center text-theme-sm text-gray-500 dark:text-gray-400">
            {t("empty")}
          </p>
        )
      ) : (
        <div
          className={`flex flex-col ${contentAlignClass} ${
            rowSpan >= 2 ? "my-auto py-4" : ""
          }`}
        >
          <p className={valueSizeClass}>
            {result.value === null
              ? "—"
              : new Intl.NumberFormat(locale, {
                  maximumFractionDigits: 2,
                }).format(result.value)}
          </p>
          {widget.widget_type === "comparison" && (
            <p className="mt-3 text-theme-sm font-medium text-success-700 dark:text-success-400">
              {result.comparison === null
                ? t("builder.noComparison")
                : t(
                    widget.comparison_mode === "previous_period"
                      ? "builder.change"
                      : "builder.progress",
                    { value: result.comparison.toFixed(1) },
                  )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
