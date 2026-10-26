"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useEventReporting } from "@/hooks/useEventReporting";
import {
  approvedResponses,
  csv,
  download,
  responseCsv,
} from "@/core/event/export";
import Button from "@/components/ui/button/Button";
import { GridIcon } from "@/icons";
import ReportShell, { panelClass } from "./ReportShell";
export default function ExportsView() {
  const { data, error, reload } = useEventReporting();
  const t = useTranslations("eventReports");
  const locale = useLocale();
  const [last, setLast] = useState<{
    content: string;
    name: string;
    at: string;
  } | null>(null);
  const rows = data ? approvedResponses(data) : [];
  function generate(kind: "responses" | "summary") {
    if (!data) return;
    const content =
      kind === "responses"
        ? responseCsv(rows, [t("id"), t("respondent"), t("submitted")])
        : csv([
            [t("item"), t("count")],
            ...data.forms
              .filter((f) => f.approved)
              .map((f) => [
                f.title,
                rows.filter((r) => r.formId === f.id).length,
              ]),
          ]);
    const name = `${kind}-${data.eventId}.csv`;
    setLast({ content, name, at: new Date().toLocaleString(locale) });
    download(content, name);
  }
  return (
    <ReportShell section="exports" loading={!data} error={error} retry={reload}>
      <div className="space-y-5">
        <div className="flex flex-wrap justify-between gap-4 rounded-2xl bg-gray-900 p-6 text-white dark:bg-gray-800">
          <div>
            <h2 className="font-semibold">{t("exports.heading")}</h2>
            <p className="mt-2 text-theme-xs text-gray-300 dark:text-gray-400">
              {t("exports.hint")}
            </p>
          </div>
          <span className="h-fit rounded-full bg-success-50 px-4 py-1 text-theme-xs text-success-700 dark:bg-success-500/15 dark:text-success-400">
            {t("exports.current")}
          </span>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {(["responses", "summary", "pdf"] as const).map((kind) => (
            <article className={`${panelClass} flex flex-col gap-5`} key={kind}>
              <span className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
                <GridIcon className="size-5" />
              </span>
              <div className="flex-1">
                <h3 className="text-theme-sm font-semibold">
                  {t(`exports.${kind}`)}
                </h3>
                <p className="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">
                  {t(`exports.${kind}Hint`)}
                </p>
              </div>
              <Button
                disabled={!rows.length}
                onClick={() =>
                  kind === "pdf" ? window.print() : generate(kind)
                }
              >
                {t(kind === "pdf" ? "exports.print" : "generate")}
              </Button>
            </article>
          ))}
        </div>
        {!rows.length && (
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            {t("exports.noApproved")}
          </p>
        )}
        {last && (
          <div
            className={`${panelClass} flex flex-wrap items-center justify-between gap-4`}
          >
            <div>
              <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                {t("exports.last")}
              </p>
              <p className="mt-1 text-theme-sm">{last.name}</p>
            </div>
            <span className="text-theme-xs text-gray-500 dark:text-gray-400">
              {last.at}
            </span>
            <Button
              variant="outline"
              onClick={() => download(last.content, last.name)}
            >
              {t("download")}
            </Button>
          </div>
        )}
      </div>
      <section id="event-print-report" className="hidden print:block">
        <h1>{data?.eventName}</h1>
        <h2>{t("exports.pdf")}</h2>
        <p>{new Date().toLocaleDateString(locale)}</p>
        <table>
          <thead>
            <tr>
              <th>{t("item")}</th>
              <th>{t("count")}</th>
            </tr>
          </thead>
          <tbody>
            {data?.forms
              .filter((f) => f.approved)
              .map((f) => (
                <tr key={f.id}>
                  <td>{f.title}</td>
                  <td>{rows.filter((r) => r.formId === f.id).length}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>
    </ReportShell>
  );
}
