"use client";
import { useTranslations } from "next-intl";
import type { AnalyticsData, Widget } from "@/types/event/analytics";
import Label from "@/components/form/Label";
interface Props {
  widget: Widget;
  data: AnalyticsData;
  onChange: (widget: Widget) => void;
  disabled: boolean;
  compact?: boolean;
}
const style =
  "w-full rounded-lg border border-gray-300 bg-white p-3 text-sm dark:border-gray-700 dark:bg-gray-900";
export default function WidgetSettings({
  widget: w,
  data,
  onChange,
  disabled,
  compact = false,
}: Props) {
  const t = useTranslations("analytics");
  const fields = data.fields.filter((f) => f.formId === w.form_id && !f.pii);
  return (
    <div
      className={
        compact ? "grid gap-5" : "grid gap-3 md:col-span-3 md:grid-cols-3"
      }
    >
      <div>
        <Label htmlFor={`source-${w.id}`}>{t("form")}</Label>
        <select
          id={`source-${w.id}`}
          disabled={disabled}
          className={style}
          value={w.form_id || ""}
          onChange={(e) =>
            onChange({
              ...w,
              form_id: e.target.value || null,
              field_id: null,
              type: "kpi",
              config_json: { metric: "submission_count" },
            })
          }
        >
          <option value="">{t("allForms")}</option>
          {data.forms.map((f) => (
            <option key={f.id} value={f.id}>
              {f.title}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor={`field-${w.id}`}>{t("field")}</Label>
        <select
          id={`field-${w.id}`}
          disabled={disabled}
          className={style}
          value={w.field_id || ""}
          onChange={(e) =>
            onChange({
              ...w,
              field_id: e.target.value || null,
              type: e.target.value ? "bar_chart" : "kpi",
              config_json: e.target.value
                ? { source: "field_distribution", chart: "bar" }
                : { metric: "submission_count" },
            })
          }
        >
          <option value="">{t("count")}</option>
          {fields.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor={`display-${w.id}`}>{t("display")}</Label>
        <select
          id={`display-${w.id}`}
          disabled={disabled || !w.field_id}
          className={style}
          value={w.type}
          onChange={(e) =>
            onChange({
              ...w,
              type: e.target.value,
              config_json:
                e.target.value === "kpi"
                  ? { metric: "avg" }
                  : {
                      source: "field_distribution",
                      chart: e.target.value === "pie_chart" ? "pie" : "bar",
                    },
            })
          }
        >
          {w.field_id ? (
            <>
              {(w.type === "kpi" ||
                fields.some(
                  (f) =>
                    f.id === w.field_id &&
                    ["number", "rating"].includes(f.type),
                )) && <option value="kpi">{t("average")}</option>}
              <option value="bar_chart">{t("bar")}</option>
              <option value="pie_chart">{t("pie")}</option>
            </>
          ) : (
            <option value={w.type}>{t("count")}</option>
          )}
        </select>
      </div>
    </div>
  );
}
