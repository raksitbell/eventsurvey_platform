"use client";

import Image from "next/image";
import WhitelistDialog from "@/components/event/whitelist/WhitelistDialog";
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
  WhitelistUniqueField,
} from "@/types/event/whitelist";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

interface WhitelistImportDialogProps {
  entries: WhitelistEntry[];
  uniqueField: WhitelistUniqueField;
  onUse: (entries: WhitelistEntry[]) => void;
  onClose: () => void;
}
export default function WhitelistImportDialog({
  entries,
  uniqueField,
  onUse,
  onClose,
}: WhitelistImportDialogProps) {
  const t = useTranslations("eventWhitelist"),
    view = useTranslations("eventWhitelistImport");
  const [preview, setPreview] = useState<WhitelistImportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [failedFile, setFailedFile] = useState<string | null>(null);
  const sequence = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(
    () => () => {
      sequence.current++;
    },
    [],
  );
  const read = async (file: File) => {
    const request = ++sequence.current;
    setBusy(true);
    setFailedFile(null);
    try {
      const rows = await readWhitelistFile(file);
      if (request === sequence.current)
        setPreview(
          previewWhitelistImport(rows, file.name, entries, uniqueField),
        );
    } catch {
      if (request === sequence.current) setFailedFile(file.name);
    } finally {
      if (request === sequence.current) setBusy(false);
    }
  };
  const choose = () => {
    setPreview(null);
    setFailedFile(null);
  };
  const invalid = !!preview?.columnMismatch || failedFile !== null;
  const fileName = preview?.fileName ?? failedFile;
  const reason = failedFile
    ? t("fileError")
    : preview?.idColumn
      ? view("duplicateHeaders")
      : view("missingEmail");
  return (
    <WhitelistDialog title={view("manage")} onClose={onClose}>
      <section className="whitelist-import-body" aria-busy={busy}>
        <h3>
          {view(invalid ? "invalid" : preview ? "preview" : "importFile")}
        </h3>
        {invalid ? (
          <>
            <p className="whitelist-import-file-name">{fileName}</p>
            <div className="whitelist-import-error" role="alert">
              <Image
                alt=""
                src="/images/event-whitelist/error.svg"
                width={22}
                height={22}
              />
              <div>
                <strong>{reason}</strong>
                <small>{view("notSaved")}</small>
              </div>
            </div>
          </>
        ) : preview ? (
          <>
            <p className="whitelist-import-file-name">
              {view("fileSummary", {
                file: preview.fileName,
                count: preview.entries.length,
              })}
            </p>
            <div className="whitelist-import-preview">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell isHeader>
                      {uniqueField.type === "email"
                        ? view("email")
                        : t("uniqueId")}
                    </TableCell>
                    <TableCell isHeader>{view("name")}</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.uniqueId}</TableCell>
                      <TableCell>{entry.name || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {(preview.invalidCount > 0 || !preview.entries.length) && (
              <p role="status" className="whitelist-import-note">
                {t("importSummary", {
                  valid: preview.entries.length,
                  invalid: preview.invalidCount,
                })}
              </p>
            )}
          </>
        ) : (
          <>
            <div className="whitelist-import-pickers">
              <input
                ref={fileInput}
                type="file"
                accept={WHITELIST_IMPORT_ACCEPT}
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void read(file);
                  event.target.value = "";
                }}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => fileInput.current?.click()}
              >
                <Image
                  alt=""
                  src="/images/event-whitelist/file.svg"
                  width={25}
                  height={25}
                />
                {view("chooseCsv")}
              </button>
              <button type="button" disabled>
                <Image
                  alt=""
                  src="/images/event-whitelist/file.svg"
                  width={25}
                  height={25}
                />
                XLSX
              </button>
            </div>
            {busy && (
              <p role="status" className="whitelist-import-note">
                {t("reading")}
              </p>
            )}
          </>
        )}
      </section>
      <footer className="whitelist-import-footer">
        {invalid && <p>{view("errorFooter", { reason })}</p>}
        <div>
          <Button
            variant="outline"
            onClick={preview && !invalid ? choose : onClose}
          >
            {view("back")}
          </Button>
          {invalid ? (
            <Button onClick={choose}>{view("chooseAgain")}</Button>
          ) : (
            preview && (
              <Button
                disabled={!preview.entries.length}
                onClick={() => onUse(preview.entries)}
              >
                {view("import")}
              </Button>
            )
          )}
        </div>
      </footer>
    </WhitelistDialog>
  );
}
