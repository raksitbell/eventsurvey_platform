"use client";
import WhitelistDialog from "@/components/event/whitelist/WhitelistDialog";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import Table, {
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table/Table";
import { previewWhitelistImport } from "@/core/event/whitelist";
import {
  readWhitelistFile,
  WHITELIST_IMPORT_ACCEPT,
} from "@/core/event/whitelist-file";
import type {
  WhitelistEntry,
  WhitelistImportPreview,
} from "@/types/event/whitelist";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
interface WhitelistImportDialogProps {
  entries: WhitelistEntry[];
  onUse: (entries: WhitelistEntry[]) => void;
  onClose: () => void;
}
export default function WhitelistImportDialog({
  entries,
  onUse,
  onClose,
}: WhitelistImportDialogProps) {
  const t = useTranslations("eventWhitelist");
  const [preview, setPreview] = useState<WhitelistImportPreview | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  const sequence = useRef(0);
  useEffect(
    () => () => {
      sequence.current++;
    },
    [],
  );
  const read = async (file: File) => {
    const request = ++sequence.current;
    setBusy(true);
    setError(false);
    try {
      const rows = await readWhitelistFile(file);
      if (request === sequence.current)
        setPreview(previewWhitelistImport(rows, file.name, entries));
    } catch {
      if (request === sequence.current) setError(true);
    } finally {
      if (request === sequence.current) setBusy(false);
    }
  };
  return (
    <WhitelistDialog
      title={t(
        preview
          ? preview.columnMismatch
            ? "columnMismatch"
            : "columnCheck"
          : "importTitle",
      )}
      onClose={onClose}
    >
      {!preview ? (
        <>
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            {t("fileTypes")}
          </p>
          <Input
            type="file"
            accept={WHITELIST_IMPORT_ACCEPT}
            disabled={busy}
            aria-label={t("chooseFile")}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void read(file);
              event.target.value = "";
            }}
          />
          {busy && (
            <p
              role="status"
              className="text-theme-sm text-gray-500 dark:text-gray-400"
            >
              {t("reading")}
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="text-theme-sm text-error-600 dark:text-error-400"
            >
              {t("fileError")}
            </p>
          )}
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              {t("cancel")}
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-theme-sm wrap-anywhere text-gray-500 dark:text-gray-400">
            {preview.fileName}
          </p>
          <div className="overflow-x-auto">
            <Table className="text-start text-theme-xs text-gray-600 dark:text-gray-300">
              <TableHeader className="bg-participant-page dark:bg-gray-800">
                <TableRow>
                  {["expectedColumn", "fileColumn", "checkResult"].map(
                    (key) => (
                      <TableCell
                        key={key}
                        isHeader
                        className="px-3 py-3 text-start"
                      >
                        {t(key)}
                      </TableCell>
                    ),
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  {
                    label: "uniqueIdRequired",
                    column: preview.idColumn,
                    ok: !!preview.idColumn && !preview.columnMismatch,
                  },
                  {
                    label: "optionalNameColumn",
                    column: preview.nameColumn,
                    ok: true,
                  },
                ].map((row) => (
                  <TableRow
                    key={row.label}
                    className="bg-participant-page dark:bg-gray-800"
                  >
                    <TableCell className="px-3 py-3">{t(row.label)}</TableCell>
                    <TableCell className="px-3 py-3 wrap-anywhere">
                      {row.column || "—"}
                    </TableCell>
                    <TableCell
                      className={`px-3 py-3 ${row.ok ? "text-success-700 dark:text-success-300" : "text-error-600 dark:text-error-400"}`}
                    >
                      {t(
                        row.ok
                          ? row.column
                            ? "matched"
                            : "optionalMissing"
                          : "missing",
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {!preview.columnMismatch && (
            <p className="text-theme-xs font-bold text-gray-500 dark:text-gray-400">
              {t("importSummary", {
                valid: preview.entries.length,
                invalid: preview.invalidCount,
              })}
            </p>
          )}
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            {t(preview.columnMismatch ? "columnsRequired" : "replaceHint")}
          </p>
          <footer className="flex flex-wrap justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              {t("cancel")}
            </Button>
            {preview.columnMismatch ? (
              <Button
                onClick={() => setPreview(null)}
                className="bg-event-action! hover:bg-event-action/90! dark:bg-event-action"
              >
                {t("chooseAgain")}
              </Button>
            ) : (
              <Button
                disabled={!preview.entries.length}
                onClick={() => onUse(preview.entries)}
                className="bg-event-action! hover:bg-event-action/90! dark:bg-event-action"
              >
                {t("useFile")}
              </Button>
            )}
          </footer>
        </>
      )}
    </WhitelistDialog>
  );
}
