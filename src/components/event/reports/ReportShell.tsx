"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/button/Button";
import { Link, usePathname } from "@/i18n/navigation";
import EventWorkspacePageHeader from "@/components/event/workspace/EventWorkspacePageHeader";
import ReportLoadingSkeleton from "@/components/event/reports/ReportLoadingSkeleton";
import Skeleton from "@/components/ui/skeleton/Skeleton";
import styles from "./dashboard-theme.module.css";

const sections = [
  { key: "dashboard", href: "/event/dashboard" },
  { key: "responses", href: "/event/responses" },
  { key: "exports", href: "/event/exports" },
] as const;

interface Props {
  section: (typeof sections)[number]["key"] | "trash";
  children: ReactNode;
  loading: boolean;
  errorStatus: number | null;
  retry: () => void;
  wide?: boolean;
}

export const panelClass =
  "rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900";

export default function ReportShell({
  section,
  children,
  loading,
  errorStatus,
  retry,
  wide,
}: Props) {
  const t = useTranslations("eventReports");
  const pathname = usePathname();
  const accessIssue = errorStatus === 401 || errorStatus === 403;
  const back = accessIssue || pathname === "/event/dashboard"
    ? undefined
    : { href: "/event/dashboard", label: t("backToDashboard") };

  return (
    <div
      className={`${styles.surface} space-y-6 text-gray-800 dark:text-gray-100`}
    >
      <EventWorkspacePageHeader
        title={t(`${section}.title`)}
        description={accessIssue ? undefined : t(section === "trash" ? "trash.description" : "publishedDescription")}
        back={back}
        action={errorStatus === null && (
          loading ? <Skeleton className="h-6 w-28 rounded-full" /> : (
            <span className="inline-flex max-w-max items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-theme-xs font-semibold text-brand-600 dark:bg-brand-900 dark:text-brand-200">
              <span aria-hidden="true" className="size-2 rounded-full bg-brand-500 dark:bg-brand-300" />
              {t("publishedEvent")}
            </span>
          )
        )}
      />
      {!accessIssue && (
        <nav
          aria-label={t("navigation")}
          className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-xl border border-gray-200 bg-gray-100 p-1 text-theme-sm dark:border-gray-800 dark:bg-gray-900"
        >
          {sections.map(({ key, href }) => {
            const isCurrent = key === section;
            return (
              <Link
                key={key}
                href={href}
                aria-current={isCurrent ? "page" : undefined}
                className={
                  isCurrent
                    ? "rounded-lg bg-white px-3 py-2 font-semibold text-brand-600 shadow-theme-xs transition dark:bg-gray-800 dark:text-brand-200"
                    : "rounded-lg px-3 py-2 font-medium text-gray-600 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }
              >
                {t(`${key}.title`)}
              </Link>
            );
          })}
        </nav>
      )}
      <div className={wide ? undefined : "mx-auto max-w-3xl md:pt-8"}>
        {errorStatus !== null ? (
          <div role="alert" className={panelClass}>
            <p>
              {t(
                errorStatus === 401
                  ? "sessionExpired"
                  : accessIssue
                    ? "dashboardUnavailable"
                    : "loadError",
              )}
            </p>
            {!accessIssue && (
              <Button className="mt-4" onClick={retry}>
                {t("retry")}
              </Button>
            )}
          </div>
        ) : loading ? (
          <ReportLoadingSkeleton section={section} label={t("loading")} />
        ) : (
          children
        )}
      </div>
    </div>
  );
}
