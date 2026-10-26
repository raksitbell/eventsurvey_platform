"use client";
import dynamic from "next/dynamic";
import { useTheme } from "@/context/ThemeContext";
import { useLocale, useTranslations } from "next-intl";
import { widgetData } from "@/core/event/widget-data";
import type { DashboardWidget, ReportingData } from "@/types/event/reporting";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
interface Props {
  widget: DashboardWidget;
  data: ReportingData;
}
export default function WidgetPreview({ widget, data }: Props) {
  const t = useTranslations("eventReports");
  const locale = useLocale();
  const { theme } = useTheme();
  const result = widgetData(widget, data);
  return (
    <div>
      <h3 className="truncate text-theme-sm font-semibold">
        {widget.title || t(`builder.${widget.widget_type}`)}
      </h3>
      <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
        {data.forms.find((f) => f.id === widget.source_form_id)?.title ??
          t("builder.allForms")}
      </p>
      {widget.widget_type === "chart" ? (
        result.groups.length ? (
          <Chart
            type={widget.chart_type ?? "line"}
            height={180}
            options={{
              theme: { mode: theme },
              chart: {
                toolbar: { show: false },
                background: "transparent",
                animations: { enabled: false },
              },
              colors: ["#465fff", "#12b76a", "#f79009"],
              stroke: { width: 3 },
              labels: result.groups.map(([k]) => k),
              xaxis: { categories: result.groups.map(([k]) => k) },
              dataLabels: { enabled: false },
              legend: { show: false },
              tooltip: { enabled: true },
            }}
            series={
              widget.chart_type === "pie" || widget.chart_type === "donut"
                ? result.groups.map(([, v]) => v)
                : [{ name: t("count"), data: result.groups.map(([, v]) => v) }]
            }
          />
        ) : (
          <p className="py-12 text-center text-theme-xs text-gray-500 dark:text-gray-400">
            {t("empty")}
          </p>
        )
      ) : (
        <>
          <p className="mt-5 text-title-sm font-semibold">
            {result.value === null
              ? "—"
              : new Intl.NumberFormat(locale, {
                  maximumFractionDigits: 2,
                }).format(result.value)}
          </p>
          {widget.widget_type === "comparison" && (
            <p className="mt-3 text-theme-xs text-success-700 dark:text-success-400">
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
        </>
      )}
    </div>
  );
}
