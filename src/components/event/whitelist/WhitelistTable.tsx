"use client";
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
}: {
  entries: WhitelistEntry[];
}) {
  const t = useTranslations("eventWhitelist");
  const used = entries.filter((e) => e.status === "joined").length;
  return (
    <section className="space-y-2.5 rounded-xl border border-preview-border bg-white p-5 sm:p-6 dark:border-gray-700 dark:bg-gray-900">
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
      <div className="overflow-x-auto">
        <Table className="text-start text-theme-sm text-gray-800 dark:text-gray-200">
          <TableHeader className="bg-participant-page text-theme-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            <TableRow>
              {["uniqueId", "name", "status"].map((key) => (
                <TableCell
                  key={key}
                  isHeader
                  className="h-12 px-3 text-start font-bold"
                >
                  {t(key)}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length ? (
              entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="h-15 px-3 break-all">
                    {entry.uniqueId}
                  </TableCell>
                  <TableCell className="px-3 wrap-anywhere">
                    {entry.name || "—"}
                  </TableCell>
                  <TableCell className="px-3 whitespace-nowrap">
                    <span
                      className={`rounded-full px-2.5 py-1 ${entry.status === "joined" ? "bg-success-50 text-success-700 dark:bg-success-900/30 dark:text-success-300" : "bg-participant-page text-gray-600 dark:bg-gray-800 dark:text-gray-300"}`}
                    >
                      {t(entry.status)}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="py-12 text-center text-gray-500 dark:text-gray-400"
                >
                  {t("empty")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
