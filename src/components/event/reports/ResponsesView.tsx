"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEventReporting } from "@/hooks/useEventReporting";
import { useModal } from "@/hooks/useModal";
import { Modal } from "@/components/ui/modal";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import ReportShell, { panelClass } from "./ReportShell";
import { api } from "@/core/api";
import { download } from "@/core/event/export";
import type { ReportingData } from "@/types/event/reporting";
import { showToast } from "@/utils/toast";
export default function ResponsesView() {
  const tErrors = useTranslations("errors");
  const searchParams = useSearchParams();
  const initialFormId =
    searchParams.get("scope") === "all"
      ? ""
      : searchParams.get("formId") || null;

  const { data, identityKey, errorStatus, reload } = useEventReporting(
    "responses",
    initialFormId,
  );

  return (
    <ReportShell
      section="responses"
      loading={!data}
      errorStatus={errorStatus}
      retry={reload}
    >
      {data &&
        (data.canViewSubmissions ? (
          <ResponseTable
            key={`${identityKey}:${data.eventId}:${initialFormId}`}
            data={data}
            initialFormId={initialFormId}
          />
        ) : (
          <p className={panelClass} role="alert">
            {tErrors("403.title")}
          </p>
        ))}
    </ReportShell>
  );
}

function ResponseTable({
  data,
  initialFormId,
}: {
  data: ReportingData;
  initialFormId: string | null;
}) {
  const t = useTranslations("eventReports");
  const locale = useLocale();
  const [formFilter, setFormFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);
  const [all, setAll] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { isOpen, openModal, closeModal } = useModal();
  const defaultFormId =
    data.forms.find((form) => form.type === "survey")?.id ?? "";
  const requestedFormId =
    initialFormId === ""
      ? ""
      : (data.forms.find((form) => form.id === initialFormId)?.id ??
        defaultFormId);
  const activeFormId = formFilter ?? requestedFormId;
  const activeForm = data.forms.find((form) => form.id === activeFormId);
  const baseRows = activeFormId
    ? data.responses.filter((row) => row.formId === activeFormId)
    : data.responses;
  const selected = baseRows.find((row) => row.id === selectedId);
  const searchTerm = search.trim().toLocaleLowerCase(locale);
  const rows = baseRows.filter((row) =>
    `${row.respondent} ${row.id}`
      .toLocaleLowerCase(locale)
      .includes(searchTerm),
  );
  const visible = all ? rows : rows.slice(0, 3);
  const submittedAt = new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  });
  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gray-900 p-6 text-white dark:bg-gray-800">
          <div>
            <h2 className="font-semibold">
              {activeForm?.type === "survey" && initialFormId === null
                ? t("responses.heading")
                : (activeForm?.title ?? t("responses.allHeading"))}
            </h2>
            <p className="mt-2 text-theme-xs text-gray-300 dark:text-gray-400">
              {t("responses.summary", {
                count: baseRows.length,
                rate: baseRows.length
                  ? Math.round(
                      (baseRows.filter((r) => r.complete).length /
                        baseRows.length) *
                        100,
                    )
                  : 0,
              })}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={!data.canExport || !rows.length || exporting}
            onClick={async () => {
              setExporting(true);
              try {
                const query = new URLSearchParams({
                  scope: "responses",
                  kind: "responses",
                  format: "csv",
                  locale,
                  eventId: data.eventId,
                  formId: activeFormId,
                  search,
                });
                const name = `responses-${data.eventId}.csv`;
                download(await api.getBlob(`/event/exports?${query}`), name);
                void showToast(t("exports.generated", { name }));
              } catch {
                void showToast(t("exports.failed"), "error");
              } finally {
                setExporting(false);
              }
            }}
          >
            {t("export")}
          </Button>
        </div>
        <section className={panelClass}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-semibold">{t("responses.latest")}</h2>
            <div className="flex flex-wrap items-center gap-3">
              {data.forms.length > 1 && (
                <div className="min-w-48">
                  <Select
                    aria-label={t("builder.source")}
                    value={activeFormId}
                    onChange={(e) => setFormFilter(e.target.value)}
                  >
                    <option value="">{t("builder.allForms")}</option>
                    {data.forms.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.title}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              <Input
                aria-label={t("search")}
                placeholder={t("search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-start text-theme-sm">
              <thead className="border-y border-gray-200 text-theme-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                <tr>
                  {["respondent", "score", "submitted", "status"].map((k) => (
                    <th
                      scope="col"
                      className="py-3 pe-4 text-start font-medium"
                      key={k}
                    >
                      {k === "status" ? (
                        <span className="sr-only">{t(k)}</span>
                      ) : (
                        t(k)
                      )}
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
                          setSelectedId(row.id);
                          openModal();
                        }}
                      >
                        {row.respondent}
                      </button>
                    </td>
                    <td className="pe-4">{row.score ?? "—"}</td>
                    <td className="pe-4 text-gray-500 dark:text-gray-400">
                      {submittedAt.format(new Date(row.submittedAt))}
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
      <Modal
        isOpen={isOpen && Boolean(selected)}
        onClose={closeModal}
        className="max-w-2xl p-6"
      >
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
    </>
  );
}
