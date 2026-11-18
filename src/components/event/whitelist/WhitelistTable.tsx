import type { ReactNode } from "react";
import { useState } from "react";
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
  onDelete,
  onAdd,
  onImport,
  readOnly,
  editor,
}: {
  entries: WhitelistEntry[];
  onDelete: (id: string) => void;
  onAdd: () => void;
  onImport: () => void;
  readOnly: boolean;
  editor?: ReactNode;
}) {
  const t = useTranslations("eventWhitelist");
  const v = useTranslations("eventWhitelistDesign");
  const s = useTranslations("eventSetup");
  const labels = useTranslations("eventWhitelistImport");
  const [query, setQuery] = useState("");
  const filtered = entries.filter((e) =>
    (e.uniqueId + " " + e.name)
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const used = entries.filter((e) => e.status === "joined").length;
  return (
    <section className="es-list-registry">
      <dl className="es-list-totals" aria-live="polite">
        {(
          [
            ["total", entries.length],
            ["used", used],
            ["unused", entries.length - used],
          ] as const
        ).map(([key, count]) => (
          <div key={key}>
            <dt>{v(key)}</dt>
            <dd>{count}</dd>
          </div>
        ))}
      </dl>
      <div className="es-list-tools">
        <h2>{v("attendees")}</h2>
        <input
          type="search"
          aria-label={s("searchList")}
          placeholder={s("searchList")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="button"
          className="es-list-import"
          disabled={readOnly}
          onClick={onImport}
        >
          {v("import")}
        </button>
        <button
          type="button"
          className="es-list-add"
          disabled={readOnly}
          onClick={onAdd}
        >
          {v("add")}
        </button>
      </div>
      {editor && (
        <p className="whitelist-inline-total" aria-live="polite">
          {labels("total", { count: entries.length })}
        </p>
      )}
      <div className="es-list-grid">
        <Table className="text-start text-theme-sm text-gray-800 dark:text-gray-200">
          <TableHeader className="bg-participant-page text-theme-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            <TableRow>
              {["email", "name", "status"].map((key) => (
                <TableCell
                  key={key}
                  isHeader
                  className="h-12 px-3 text-start font-bold"
                >
                  {v(key)}
                </TableCell>
              ))}
              <TableCell isHeader>{s("manage")}</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length
              ? filtered.map((entry) => (
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
                        {v(entry.status)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        disabled={readOnly || entry.status === "joined"}
                        aria-label={s("removeEntry", { email: entry.uniqueId })}
                        className="p-2 text-error-600 disabled:text-gray-400 dark:text-error-400"
                        onClick={() => onDelete(entry.id)}
                      >
                        <span className="es-list-trash" aria-hidden="true" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              : !editor && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-12 text-center text-gray-500 dark:text-gray-400"
                    >
                      {t("empty")}
                    </TableCell>
                  </TableRow>
                )}
            {editor}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
