"use client";
import { useTranslations } from "next-intl";
import { GridIcon, TableIcon, PieChartIcon } from "@/icons";
interface Props {
  onAdd: (type: string) => void;
  disabled: boolean;
  canChart: boolean;
}
export default function WidgetPalette({ onAdd, disabled, canChart }: Props) {
  const t = useTranslations("analytics");
  const types = [
    { type: "kpi", label: "metric", hint: "metricHint", icon: GridIcon },
    { type: "bar_chart", label: "bar", hint: "chartHint", icon: GridIcon },
    { type: "pie_chart", label: "pie", hint: "chartHint", icon: PieChartIcon },
    {
      type: "data_table",
      label: "responses",
      hint: "tableHint",
      icon: TableIcon,
    },
  ];
  return (
    <aside className="rounded-xl border border-gray-200 bg-gray-25 p-4 dark:border-gray-700 dark:bg-gray-900">
      <h2 className="text-lg font-semibold">{t("builderUi.widgets")}</h2>
      <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
        {t("builderUi.dragHint")}
      </p>
      <div className="mt-6 space-y-4">
        {types.map(({ type, label, hint, icon: Icon }) => {
          const blocked =
            disabled ||
            (!canChart && ["bar_chart", "pie_chart"].includes(type));
          return (
            <button
              key={type}
              type="button"
              draggable={!blocked}
              disabled={blocked}
              onDragStart={(e) =>
                e.dataTransfer.setData("application/eventsurvey-widget", type)
              }
              onClick={() => onAdd(type)}
              className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-start transition hover:border-brand-400 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-950 dark:hover:border-brand-400"
            >
              <span className="text-gray-400 dark:text-gray-500" aria-hidden>
                ⠿
              </span>
              <span className="rounded-lg bg-brand-50 p-2 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400">
                <Icon className="size-5" />
              </span>
              <span>
                <span className="block text-sm font-medium">
                  {t(label === "metric" ? "builderUi.metric" : label)}
                </span>
                <span className="mt-1 block text-theme-xs text-gray-500 dark:text-gray-400">
                  {t(`builderUi.${hint}`)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-10 rounded-xl bg-brand-50 p-4 text-theme-xs text-gray-500 dark:bg-brand-500/10 dark:text-gray-400">
        <p className="mb-2 font-semibold text-brand-500 dark:text-brand-400">
          {t("builderUi.tip")}
        </p>
        {t("builderUi.tipText")}
      </div>
    </aside>
  );
}
