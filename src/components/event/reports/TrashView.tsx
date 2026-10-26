"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useEventReporting } from "@/hooks/useEventReporting";
import { useConfirm } from "@/hooks/useConfirm";
import { api } from "@/core/api";
import Button from "@/components/ui/button/Button";
import { showToast } from "@/utils/toast";
import ReportShell, { panelClass } from "./ReportShell";
export default function TrashView() {
  const { data, error, reload } = useEventReporting();
  const t = useTranslations("eventReports");
  const locale = useLocale();
  const { confirm } = useConfirm();
  const [pending, setPending] = useState<string | null>(null);
  async function restore(id: string) {
    if (!(await confirm({ title: t("restore"), message: t("trash.confirm") })))
      return;
    setPending(id);
    try {
      await api.post(`/event/trash?locale=${locale}`, { id });
      await showToast(t("trash.restored"));
      reload();
    } catch {
      await showToast(t("actionError"), "error");
    } finally {
      setPending(null);
    }
  }
  return (
    <ReportShell section="trash" loading={!data} error={error} retry={reload}>
      <div className="space-y-5">
        <div className="rounded-2xl bg-warning-50 p-5 dark:bg-warning-500/10">
          <h2 className="font-medium text-warning-700 dark:text-warning-400">
            {t("trash.retention")}
          </h2>
          <p className="mt-2 text-theme-xs text-gray-600 dark:text-gray-400">
            {t("trash.hint")}
          </p>
        </div>
        <section className={panelClass}>
          <div className="flex items-center gap-5">
            <h2 className="font-semibold">{t("trash.heading")}</h2>
            <span className="rounded-full bg-warning-50 px-3 py-1 text-theme-xs text-warning-700 dark:bg-warning-500/10 dark:text-warning-400">
              {t("items", { count: data?.trash.length ?? 0 })}
            </span>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-theme-sm">
              <thead>
                <tr className="border-y border-gray-200 text-theme-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  {["item", "deletedBy", "expires", "action"].map((k) => (
                    <th key={k} className="py-3 pe-4 text-start font-medium">
                      {t(k)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.trash.map((row) => (
                  <tr
                    className="border-b border-gray-100 dark:border-gray-800"
                    key={row.id}
                  >
                    <td className="py-4 pe-4">
                      <p className="font-medium">{row.name}</p>
                      <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
                        {t(`resource.${row.type}`)}
                      </p>
                    </td>
                    <td className="pe-4">{row.deletedBy}</td>
                    <td className="pe-4 text-theme-xs text-gray-500 dark:text-gray-400">
                      {t("days", {
                        count: Math.max(
                          0,
                          Math.ceil(
                            (Date.parse(row.expiresAt) - Date.now()) / 86400000,
                          ),
                        ),
                      })}
                    </td>
                    <td>
                      <Button
                        size="sm"
                        disabled={!row.canRestore || pending !== null}
                        onClick={() => void restore(row.id)}
                      >
                        {pending === row.id ? t("loading") : t("restore")}
                      </Button>
                      {!row.canRestore && (
                        <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
                          {t("trash.unavailable")}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data?.trash.length && (
              <p className="py-10 text-center text-gray-500 dark:text-gray-400">
                {t("empty")}
              </p>
            )}
          </div>
          <p className="mt-8 text-theme-xs text-gray-500 dark:text-gray-400">
            {t("trash.footer")}
          </p>
        </section>
      </div>
    </ReportShell>
  );
}
