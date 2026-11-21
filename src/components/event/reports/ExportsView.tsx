"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useExportSummary } from "@/hooks/useEventReporting";
import { download } from "@/core/event/export";
import { api } from "@/core/api";
import Button from "@/components/ui/button/Button";
import {
  ChartBarIcon,
  DocumentChartBarIcon,
  TableCellsIcon,
} from "@heroicons/react/24/outline";
import type { ExportSummary } from "@/types/event/reporting";
import { showToast } from "@/utils/toast";
import ReportShell, { panelClass } from "./ReportShell";

const formats = [
  { kind: "responses", Icon: TableCellsIcon },
  { kind: "summary", Icon: ChartBarIcon },
  { kind: "pdf", Icon: DocumentChartBarIcon },
] as const;
export default function ExportsView() {
  const { data, identityKey, errorStatus, reload } = useExportSummary();

  return (
    <ReportShell
      section="exports"
      loading={!data}
      errorStatus={errorStatus}
      retry={reload}
    >
      {data && (
        <ExportPanel key={`${identityKey}:${data.eventId}`} data={data} />
      )}
    </ReportShell>
  );
}

function ExportPanel({ data }: { data: ExportSummary }) {
  const t = useTranslations("eventReports");
  const locale = useLocale();
  const [last, setLast] = useState<{
    content: Blob;
    name: string;
    at: string;
  } | null>(null);
  const forms = data.forms;
  const hasResponses = forms.some((form) => form.count > 0);
  const [busy, setBusy] = useState(false);

  async function generate(kind: "responses" | "summary") {
    setBusy(true);
    try {
      const params = new URLSearchParams({
        kind,
        format: "csv",
        locale,
        eventId: data.eventId,
      });
      const content = await api.getBlob(`/event/exports?${params}`);
      const name = `${kind}-${data.eventId}.csv`;
      setLast({
        content,
        name,
        at: new Date().toLocaleString(locale, { timeZone: "Asia/Bangkok" }),
      });
      download(content, name);
      void showToast(t("exports.generated", { name }));
    } catch {
      void showToast(t("exports.failed"), "error");
    } finally {
      setBusy(false);
    }
  }

  function redownload(content: Blob, name: string) {
    try {
      download(content, name);
      void showToast(t("exports.downloaded", { name }));
    } catch {
      void showToast(t("exports.failed"), "error");
    }
  }

  function printReport() {
    try {
      globalThis.print();
      void showToast(t("exports.printReady"), "info");
    } catch {
      void showToast(t("exports.failed"), "error");
    }
  }

  return (
    <>
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
        <div className="grid gap-5 sm:grid-cols-3">
          {formats.map(({ kind, Icon }) => (
            <article className={`${panelClass} flex flex-col gap-5`} key={kind}>
              <span className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
                <Icon aria-hidden="true" className="size-5" />
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
                disabled={busy || !hasResponses}
                onClick={() =>
                  kind === "pdf" ? printReport() : void generate(kind)
                }
              >
                {t(kind === "pdf" ? "exports.print" : "generate")}
              </Button>
            </article>
          ))}
        </div>
        {!hasResponses && (
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
              onClick={() => redownload(last.content, last.name)}
            >
              {t("download")}
            </Button>
          </div>
        )}
      </div>
      <section id="event-print-report" className="hidden print:block">
        <h1>{data.eventName}</h1>
        <h2>{t("exports.pdf")}</h2>
        <p>
          {new Date().toLocaleDateString(locale, { timeZone: "Asia/Bangkok" })}
        </p>
        <table>
          <thead>
            <tr>
              <th>{t("item")}</th>
              <th>{t("count")}</th>
            </tr>
          </thead>
          <tbody>
            {forms.map((f) => (
              <tr key={f.id}>
                <td>{f.title}</td>
                <td>{f.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
