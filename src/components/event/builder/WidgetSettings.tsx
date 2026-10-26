"use client";
import { useTranslations } from "next-intl";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import type { DashboardWidget, ReportingData } from "@/types/event/reporting";
interface Props {
  widget: DashboardWidget;
  data: ReportingData;
  change: (patch: Partial<DashboardWidget>) => void;
  remove: () => void;
}
export default function WidgetSettings({
  widget,
  data,
  change,
  remove,
}: Props) {
  const t = useTranslations("eventReports");
  return (
    <div className="space-y-5">
      <h2 className="font-semibold">{t("builder.settings")}</h2>
      <div>
        <Label htmlFor="widget-title">{t("builder.widgetTitle")}</Label>
        <Input
          id="widget-title"
          maxLength={240}
          value={widget.title}
          onChange={(e) => change({ title: e.target.value })}
        />
      </div>
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
      {widget.widget_type === "chart" ? (
        <div>
          <Label htmlFor="widget-chart">{t("builder.display")}</Label>
          <Select
            id="widget-chart"
            value={widget.chart_type ?? "line"}
            onChange={(e) =>
              change({
                chart_type: e.target.value as DashboardWidget["chart_type"],
                aggregation: "count",
              })
            }
          >
            {["line", "bar", "pie", "donut"].map((k) => (
              <option key={k} value={k}>
                {t(`builder.${k}`)}
              </option>
            ))}
          </Select>
        </div>
      ) : widget.widget_type === "number" ? (
        <div>
          <Label htmlFor="widget-aggregation">{t("builder.aggregation")}</Label>
          <Select
            id="widget-aggregation"
            value={widget.aggregation}
            onChange={(e) =>
              change({
                aggregation: e.target.value as DashboardWidget["aggregation"],
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
        <>
          <div>
            <Label htmlFor="widget-comparison">{t("builder.comparison")}</Label>
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
        </>
      )}
      <div>
        <Label htmlFor="widget-range">{t("builder.range")}</Label>
        <Select
          id="widget-range"
          value={widget.date_range_days ?? 0}
          onChange={(e) => change({ date_range_days: Number(e.target.value) })}
        >
          {[0, 7, 30, 90].map((days) => (
            <option key={days} value={days}>
              {days
                ? t("builder.lastDays", { count: days })
                : t("builder.allTime")}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="widget-width">{t("builder.width")}</Label>
        <input
          id="widget-width"
          className="w-full accent-brand-500"
          type="range"
          min={4}
          max={12}
          step={2}
          value={widget.grid_span ?? 6}
          onChange={(e) => change({ grid_span: Number(e.target.value) })}
        />
      </div>
      <Button
        variant="outline"
        className="w-full text-error-600 dark:text-error-400"
        onClick={remove}
      >
        {t("builder.remove")}
      </Button>
    </div>
  );
}
