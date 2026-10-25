"use client";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { useState } from "react";
import { useTranslations } from "next-intl";
import type { AnalyticsData } from "@/types/event/analytics";
import Button from "@/components/ui/button/Button";
interface Props {
  data: AnalyticsData;
}
export default function ResponseTable({ data }: Props) {
  const t = useTranslations("analytics"),
    [page, setPage] = useState(0),
    size = 20;
  const max = Math.max(0, Math.ceil(data.rows.length / size) - 1),
    current = Math.min(page, max);
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-4 text-lg font-semibold">
        {t("responses")} ({data.rows.length})
      </h2>
      <div className="custom-scrollbar overflow-x-auto">
        <Table className="w-full text-start text-sm">
          <TableHeader className="border-b border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400">
            <TableRow>
              {[
                t("id"),
                t("form"),
                t("submitted"),
                ...data.fields.map((f) => f.label),
              ].map((s, i) => (
                <TableCell
                  isHeader
                  key={i}
                  className="p-3 text-start font-medium whitespace-nowrap"
                >
                  {s}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.slice(current * size, (current + 1) * size).map((r) => (
              <TableRow
                key={r.id}
                className="border-b border-gray-100 dark:border-gray-800"
              >
                <TableCell className="p-3">{r.id.slice(0, 8)}</TableCell>
                <TableCell className="p-3">
                  {data.forms.find((f) => f.id === r.formId)?.title}
                </TableCell>
                <TableCell className="p-3 whitespace-nowrap">
                  {new Intl.DateTimeFormat(data.filters.locale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: data.event.timezone,
                  }).format(new Date(r.submittedAt))}
                </TableCell>
                {data.fields.map((f) => (
                  <TableCell key={f.id} className="max-w-xs p-3 break-words">
                    {r.values[f.id] || "—"}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {!data.rows.length && (
        <p className="py-8 text-center text-gray-500 dark:text-gray-400">
          {t("empty")}
        </p>
      )}
      <div className="mt-4 flex items-center justify-between gap-3">
        <Button
          variant="outline"
          disabled={current === 0}
          onClick={() => setPage(current - 1)}
        >
          {t("previous")}
        </Button>
        <span>
          {current + 1} / {max + 1}
        </span>
        <Button
          variant="outline"
          disabled={current === max}
          onClick={() => setPage(current + 1)}
        >
          {t("next")}
        </Button>
      </div>
    </section>
  );
}
