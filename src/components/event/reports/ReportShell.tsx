"use client";
// Event dashboard
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/button/Button";
import { Link } from "@/i18n/navigation";
interface Props {
  section:
    | "responses"
    | "exports"
    | "trash"
    | "builder"
    | "dashboard"
    | "analytics";
  children: ReactNode;
  loading?: boolean;
  error?: boolean;
  retry?: () => void;
  wide?: boolean;
}
export const panelClass =
  "rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900";
export default function ReportShell({
  section,
  children,
  loading,
  error,
  retry,
  wide,
}: Props) {
  const t = useTranslations("eventReports");
  const tf = useTranslations("eventAnalytics.footer");
  const activeSection = section === "builder" ? "dashboard" : section;
  return (
    <div className="space-y-6 text-gray-800 dark:text-gray-100">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-title-sm font-bold">
            {t(`${activeSection}.title`)}
          </h1>
          <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
            {t(`${activeSection}.description`)}
          </p>
        </div>
        <nav
          aria-label={t("navigation")}
          className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-gray-200 bg-gray-100/80 p-1 text-theme-sm dark:border-gray-800 dark:bg-gray-900"
        >
          {(
            ["dashboard", "responses", "exports", "trash", "analytics"] as const
          ).map((k) => {
            const isCurrent = k === activeSection;
            return (
              <Link
                aria-current={isCurrent ? "page" : undefined}
                className={
                  isCurrent
                    ? "rounded-lg bg-white px-3.5 py-2 font-semibold text-brand-600 shadow-theme-xs transition dark:bg-gray-800 dark:text-brand-400"
                    : "rounded-lg px-3.5 py-2 font-medium text-gray-600 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }
                key={k}
                href={k === "dashboard" ? "/event/dashboard" : `/event/${k}`}
              >
                {t(`${k}.title`)}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className={wide ? "" : "max-w-4xl"}>
        {error ? (
          <div role="alert" className={panelClass}>
            <p className="mb-4">{t("loadError")}</p>
            <Button onClick={retry}>{t("retry")}</Button>
          </div>
        ) : loading ? (
          <p role="status" className={panelClass}>
            {t("loading")}
          </p>
        ) : (
          children
        )}
      </div>
      <footer className="pt-10 text-theme-xs text-gray-500 dark:text-gray-400">
        {tf("copyright")} - {tf("name_oo")}
      </footer>
    </div>
  );
}
