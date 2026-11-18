"use client";
import Input from "@/components/form/input/InputField";
import { TrashIcon } from "@heroicons/react/24/outline";
import type { WhitelistRowIssue } from "@/types/event/whitelist";
import Table, {
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table/Table";
import type { WhitelistEntry } from "@/types/event/whitelist";
import { useTranslations } from "next-intl";
export default function WhitelistTable({
  entries,
  management = false,
  readOnly = false,
  onDelete,
  editor,
}: {
  entries: WhitelistEntry[];
  management?: boolean;
  readOnly?: boolean;
  onDelete?: (entry: WhitelistEntry) => void;
  editor?: {
    uniqueId: string;
    name: string;
    error: WhitelistRowIssue | null;
    onUniqueId: (value: string) => void;
    onName: (value: string) => void;
    onSubmit: () => void;
  };
}) {
  const t = useTranslations("eventWhitelist");
  const used = entries.filter((e) => e.status === "joined").length;
  return (
    <section
      className={
        management
          ? "overflow-hidden rounded-xl border border-preview-border bg-white dark:border-gray-700 dark:bg-gray-900"
          : "space-y-2.5 rounded-xl border border-preview-border bg-white p-5 sm:p-6 dark:border-gray-700 dark:bg-gray-900"
      }
    >
      {!management && (
        <header className="flex flex-wrap items-center justify-between gap-3 py-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {t("activeList")}
          </h2>
          <p className="text-theme-sm font-bold text-gray-500 dark:text-gray-400">
            {t("summary", {
              total: entries.length,
              used,
              unused: entries.length - used,
            })}
          </p>
        </header>
      )}
      <div className="overflow-x-auto">
        <Table className="text-start text-theme-sm text-gray-800 dark:text-gray-200">
          <TableHeader className="bg-participant-page text-theme-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            <TableRow>
              {(management
                ? ["email", "name", "status", "manage"]
                : ["uniqueId", "name", "status"]
              ).map((key) => (
                <TableCell
                  key={key}
                  isHeader
                  className={`h-12 px-4 font-bold ${key === "status" || key === "manage" ? "text-center" : "text-start"}`}
                >
                  {t(key)}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length ? (
              entries.map((entry) => (
                <TableRow
                  key={entry.id}
                  className="border-t border-preview-border dark:border-gray-700"
                >
                  <TableCell
                    className={`${management ? "h-21.5" : "h-15"} px-4 break-all`}
                  >
                    {entry.uniqueId}
                  </TableCell>
                  <TableCell className="px-3 wrap-anywhere">
                    {entry.name || "—"}
                  </TableCell>
                  <TableCell className="px-4 text-center whitespace-nowrap">
                    <span
                      className={`rounded-full px-2.5 py-1 ${entry.status === "joined" ? "bg-success-50 text-success-700 dark:bg-success-900/30 dark:text-success-300" : "bg-participant-page text-gray-600 dark:bg-gray-800 dark:text-gray-300"}`}
                    >
                      {t(entry.status)}
                    </span>
                  </TableCell>
                  {management && (
                    <TableCell className="px-3 text-center">
                      {entry.status === "joined" ? (
                        "—"
                      ) : (
                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={() => onDelete?.(entry)}
                          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 text-theme-xs font-semibold text-error-600 hover:bg-error-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-error-400 dark:hover:bg-error-900/20"
                        >
                          <TrashIcon className="size-4.5" aria-hidden="true" />
                          <span>{t("delete")}</span>
                          <span className="sr-only"> {entry.uniqueId}</span>
                        </button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : !editor ? (
              <TableRow>
                <TableCell
                  colSpan={management ? 4 : 3}
                  className="py-12 text-center text-gray-500 dark:text-gray-400"
                >
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : null}
            {editor && (
              <TableRow className="border-t border-preview-border dark:border-gray-700">
                <TableCell className="min-w-60 p-2">
                  <Input
                    autoFocus
                    type="email"
                    maxLength={500}
                    aria-label={t("email")}
                    placeholder={t("emailPlaceholder")}
                    value={editor.uniqueId}
                    error={!!editor.error}
                    aria-invalid={!!editor.error}
                    onChange={(event) => editor.onUniqueId(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        editor.onSubmit();
                      }
                    }}
                  />
                  {editor.error && (
                    <p
                      role="alert"
                      className="mt-1 text-theme-xs text-error-600 dark:text-error-400"
                    >
                      {t(`errors.${editor.error}`)}
                    </p>
                  )}
                </TableCell>
                <TableCell className="min-w-40 p-2">
                  <Input
                    maxLength={500}
                    aria-label={t("name")}
                    placeholder={t("namePlaceholder")}
                    value={editor.name}
                    onChange={(event) => editor.onName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        editor.onSubmit();
                      }
                    }}
                  />
                </TableCell>
                <TableCell className="h-20 px-3 text-center text-theme-xs text-gray-500 dark:text-gray-400">
                  {t("newEntry")}
                </TableCell>
                <TableCell>{null}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
