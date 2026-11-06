"use client";
import type { AnalyticsData } from "@/types/event/analytics";
import { useTranslations } from "next-intl";
import AnalyticsChart from "./AnalyticsChart";
interface Props {
  data: AnalyticsData;
}
export default function DashboardWidgets({ data }: Props) {
  const t = useTranslations("analytics");
  const card =
    "rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900";
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        {(["total", "registrations", "surveys"] as const).map((key) => (
          <section key={key} className={card}>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t(key)}</p>
            <p className="mt-3 text-3xl font-semibold">
              {new Intl.NumberFormat(data.filters.locale).format(
                data.metrics[key],
              )}
            </p>
          </section>
        ))}
      </div>
      <section className={card}>
        <h2 className="text-lg font-semibold">{t("trend")}</h2>
        <AnalyticsChart
          points={data.trend.map((p) => ({ label: p.day, count: p.count }))}
        />
      </section>
      {data.dashboards.map((d) => (
        <section key={d.id} className="space-y-4">
          <h2 className="text-lg font-semibold">
            {data.filters.locale === "th" ? d.title_th : d.title_en}
          </h2>
          <div className="grid grid-cols-12 gap-4">
            {data.widgets
              .filter((w) => w.dashboard_data_id === d.id)
              .map((w) => (
                <section
                  key={w.id}
                  className={`${card} col-span-12 ${w.config_json.span === 12 ? "" : w.config_json.span === 4 ? "md:col-span-4" : w.config_json.span === 6 ? "md:col-span-6" : d.layout_json.columns === 3 ? "md:col-span-4" : d.layout_json.columns === 2 ? "md:col-span-6" : ""}`}
                >
                  <h3 className="mb-3 font-medium">
                    {data.filters.locale === "th" ? w.title_th : w.title_en}
                  </h3>
                  {w.type === "kpi" ? (
                    <p className="text-3xl font-semibold">
                      {w.value === null
                        ? "—"
                        : new Intl.NumberFormat(data.filters.locale, {
                            maximumFractionDigits: 2,
                          }).format(w.value)}
                    </p>
                  ) : (w.type === "bar_chart" || w.type === "pie_chart") &&
                    w.field_id ? (
                    <AnalyticsChart
                      type={w.type === "pie_chart" ? "pie" : "bar"}
                      points={w.distribution}
                    />
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t(w.type === "data_table" ? "tableHint" : "unsupported")}
                    </p>
                  )}
                </section>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
