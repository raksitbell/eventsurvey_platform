"use client";
import { useTranslations } from "next-intl";
import { useEventReporting } from "@/hooks/useEventReporting";
import { Link } from "@/i18n/navigation";
import WidgetPreview from "./WidgetPreview";
import ReportShell, {
  panelClass,
} from "@/components/event/reports/ReportShell";
export default function PublishedDashboard() {
  const { data, error, reload } = useEventReporting();
  const t = useTranslations("eventReports");
  return (
    <ReportShell
      section="dashboard"
      loading={!data}
      error={error}
      retry={reload}
      wide
    >
      {data && (
        <>
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="font-semibold">{data.eventName}</h2>
            {data.canManage && (
              <Link
                className="text-theme-sm text-brand-600 hover:underline dark:text-brand-400"
                href="/event/dashboard/builder"
              >
                {t("builder.title")}
              </Link>
            )}
          </div>
          <div className="grid grid-cols-12 gap-5">
            {data.widgets.map((widget) => (
              <section
                key={widget.id}
                style={
                  {
                    "--widget-span": widget.grid_span ?? 6,
                  } as React.CSSProperties
                }
                className={`${panelClass} col-span-12 md:col-span-(--widget-span)`}
              >
                <WidgetPreview data={data} widget={widget} />
              </section>
            ))}
          </div>
          {!data.widgets.length && <p className={panelClass}>{t("empty")}</p>}
        </>
      )}
    </ReportShell>
  );
}
