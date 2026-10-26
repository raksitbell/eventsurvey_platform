"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useEventReporting } from "@/hooks/useEventReporting";
import { useModal } from "@/hooks/useModal";
import { Modal } from "@/components/ui/modal";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import ReportShell, { panelClass } from "./ReportShell";
import { download, responseCsv } from "@/core/event/export";
import type { ResponseRow } from "@/types/event/reporting";
export default function ResponsesView() {
  const { data, error, reload } = useEventReporting();
  const t = useTranslations("eventReports");
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const [all, setAll] = useState(false);
  const [selected, setSelected] = useState<ResponseRow | null>(null);
  const { isOpen, openModal, closeModal } = useModal();
  const rows =
    data?.responses.filter(
      (r) =>
        data.forms.some((f) => f.id === r.formId && f.type === "survey") &&
        `${r.respondent} ${r.id}`.toLowerCase().includes(search.toLowerCase()),
    ) ?? [];
  const visible = all ? rows : rows.slice(0, 3);
  const total =
    data?.responses.filter((r) =>
      data.forms.some((f) => f.id === r.formId && f.type === "survey"),
    ) ?? [];
  return (
    <ReportShell
      section="responses"
      loading={!data}
      error={error}
      retry={reload}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gray-900 p-6 text-white dark:bg-gray-800">
          <div>
            <h2 className="font-semibold">{t("responses.heading")}</h2>
            <p className="mt-2 text-theme-xs text-gray-300 dark:text-gray-400">
              {t("responses.summary", {
                count: total.length,
                rate: total.length
                  ? Math.round(
                      (total.filter((r) => r.complete).length / total.length) *
                        100,
                    )
                  : 0,
              })}
            </p>
          </div>
          <Button
            variant="outline"
            disabled={!rows.length}
            onClick={() =>
              download(
                responseCsv(rows, [t("id"), t("respondent"), t("submitted")]),
                "survey-responses.csv",
              )
            }
          >
            {t("export")}
          </Button>
        </div>
        <section className={panelClass}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-semibold">{t("responses.latest")}</h2>
            <Input
              aria-label={t("search")}
              placeholder={t("search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-start text-theme-sm">
              <thead className="border-y border-gray-200 text-theme-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                <tr>
                  {["respondent", "score", "submitted", "status"].map((k) => (
                    <th className="py-3 pe-4 text-start font-medium" key={k}>
                      {t(k)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr
                    className="border-b border-gray-100 dark:border-gray-800"
                    key={row.id}
                  >
                    <td className="py-4 pe-4">
                      <button
                        className="font-medium text-brand-600 hover:underline dark:text-brand-400"
                        onClick={() => {
                          setSelected(row);
                          openModal();
                        }}
                      >
                        {row.respondent}
                      </button>
                    </td>
                    <td className="pe-4">{row.score ?? "—"}</td>
                    <td className="pe-4 text-gray-500 dark:text-gray-400">
                      {new Date(row.submittedAt).toLocaleString(locale)}
                    </td>
                    <td>
                      <span
                        className={
                          row.complete
                            ? "rounded-full bg-success-50 px-3 py-1 text-theme-xs text-success-700 dark:bg-success-500/15 dark:text-success-400"
                            : "rounded-full bg-warning-50 px-3 py-1 text-theme-xs text-warning-700 dark:bg-warning-500/15 dark:text-warning-400"
                        }
                      >
                        {t(row.complete ? "complete" : "partial")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && (
              <p className="py-10 text-center text-gray-500 dark:text-gray-400">
                {t("empty")}
              </p>
            )}
          </div>
          <div className="mt-5 flex items-center justify-between gap-4">
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              {t("showing", { count: visible.length, total: rows.length })}
            </p>
            <Button
              variant="outline"
              onClick={() => setAll((v) => !v)}
              disabled={rows.length <= 3}
            >
              {t(all ? "less" : "all")}
            </Button>
          </div>
        </section>
      </div>
      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-2xl p-6">
        <h2 className="mb-5 text-xl font-semibold text-gray-900 dark:text-white">
          {t("responses.detail")}
        </h2>
        <dl className="max-h-96 space-y-4 overflow-auto">
          {selected?.answers.map((a) => (
            <div key={a.fieldId}>
              <dt className="text-theme-xs text-gray-500 dark:text-gray-400">
                {a.label}
              </dt>
              <dd className="mt-1 break-words text-gray-800 dark:text-gray-200">
                {a.value || "—"}
              </dd>
            </div>
          ))}
        </dl>
      </Modal>
    </ReportShell>
  );
}
