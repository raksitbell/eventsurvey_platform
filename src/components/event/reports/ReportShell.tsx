"use client";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/button/Button";
import { Link } from "@/i18n/navigation";
interface Props {
  section: "responses" | "exports" | "trash" | "builder" | "dashboard";
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
  return (
    <div className="space-y-7 text-gray-800 dark:text-gray-100">
      <div>
        <h1 className="text-title-sm font-bold">{t(`${section}.title`)}</h1>
        <p className="mt-2 text-theme-sm text-gray-500 dark:text-gray-400">
          {t(`${section}.description`)}
        </p>
      </div>
      <nav
        aria-label={t("navigation")}
        className="flex flex-wrap gap-4 text-theme-sm text-brand-600 dark:text-brand-400"
      >
        {(["builder", "responses", "exports", "trash"] as const).map((k) => (
          <Link
            aria-current={k === section ? "page" : undefined}
            className={
              k === section
                ? "font-semibold underline underline-offset-8"
                : "hover:underline"
            }
            key={k}
            href={k === "builder" ? "/event/dashboard/builder" : `/event/${k}`}
          >
            {t(`${k}.title`)}
          </Link>
        ))}
      </nav>
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
        © EventSurvey
      </footer>
    </div>
  );
}
