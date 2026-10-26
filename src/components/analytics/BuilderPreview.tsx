"use client";
import { useTranslations } from "next-intl";
import type { AnalyticsData, Widget } from "@/types/event/analytics";
import AnalyticsChart from "./AnalyticsChart";
interface Props {
  widget: Widget;
  data: AnalyticsData;
}
export default function BuilderPreview({ widget, data }: Props) {
  const t = useTranslations("analytics");
  const rows = data.rows.filter(
    (row) => !widget.form_id || row.formId === widget.form_id,
  );
  if (widget.type === "kpi") {
    const numbers = widget.field_id
      ? rows
          .map((r) => r.values[widget.field_id!])
          .filter(
            (v) => v !== "" && v !== undefined && Number.isFinite(Number(v)),
          )
          .map(Number)
      : [];
    const value =
      widget.config_json.metric === "avg"
        ? numbers.length
          ? numbers.reduce((a, b) => a + b, 0) / numbers.length
          : null
        : rows.length;
    return (
      <div className="py-5">
        <p className="text-3xl font-semibold text-gray-900 dark:text-white">
          {value === null
            ? "—"
            : new Intl.NumberFormat(data.filters.locale, {
                maximumFractionDigits: 2,
              }).format(value)}
        </p>
        <p className="mt-3 text-theme-xs text-gray-500 dark:text-gray-400">
          {t("builderUi.liveData")}
        </p>
      </div>
    );
  }
  if (widget.type === "data_table")
    return (
      <div className="space-y-4 py-4">
        {rows.slice(0, 3).map((row) => (
          <div
            key={row.id}
            className="flex flex-wrap justify-between gap-2 text-theme-xs text-gray-500 dark:text-gray-400"
          >
            <span>{row.id.slice(0, 8)}</span>
            <span>
              {new Intl.DateTimeFormat(data.filters.locale, {
                dateStyle: "medium",
                timeZone: data.event.timezone,
              }).format(new Date(row.submittedAt))}
            </span>
          </div>
        ))}
        {!rows.length && <p>{t("empty")}</p>}
        <p className="text-sm text-brand-500 dark:text-brand-400">
          {t("responses")} · {rows.length}
        </p>
      </div>
    );
  const counts = new Map<string, number>();
  if (widget.field_id)
    for (const row of rows) {
      const value = row.values[widget.field_id];
      if (value && value !== "••••")
        for (const item of value.split("; "))
          counts.set(item, (counts.get(item) || 0) + 1);
    }
  return (
    <div className="pointer-events-none min-w-0">
      <AnalyticsChart
        type={widget.type === "pie_chart" ? "pie" : "bar"}
        points={Array.from(counts, ([label, count]) => ({ label, count }))}
      />
    </div>
  );
}
