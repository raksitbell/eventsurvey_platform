"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { TableCell, TableRow } from "@/components/ui/table/Table";
import type { WhitelistRowIssue } from "@/types/event/whitelist";
import "./whitelist-dialog.css";

export interface WhitelistEntryDraft {
  uniqueId: string;
  name: string;
}

interface WhitelistEntryRowProps {
  formId: string;
  value: WhitelistEntryDraft;
  onChange: (value: WhitelistEntryDraft) => void;
  issue: WhitelistRowIssue | null;
}

export default function WhitelistEntryRow({
  formId,
  value,
  onChange,
  issue,
}: WhitelistEntryRowProps) {
  const t = useTranslations("eventWhitelist"),
    view = useTranslations("eventWhitelistImport");
  const email = useRef<HTMLInputElement>(null);
  useEffect(() => {
    email.current?.focus();
  }, [issue]);
  return (
    <TableRow className="whitelist-inline-row">
      <TableCell>
        <input
          ref={email}
          form={formId}
          type="email"
          required
          maxLength={500}
          aria-label={t("uniqueIdRequired")}
          placeholder={view("enterEmail")}
          value={value.uniqueId}
          aria-invalid={!!issue}
          aria-describedby={issue ? formId + "-issue" : undefined}
          onChange={(e) => onChange({ ...value, uniqueId: e.target.value })}
        />
      </TableCell>
      <TableCell>
        <input
          form={formId}
          type="text"
          maxLength={500}
          aria-label={t("optionalName")}
          placeholder={view("enterName")}
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
        />
      </TableCell>
      <TableCell>
        <span>{view("new")}</span>
      </TableCell>
      <TableCell>{null}</TableCell>
    </TableRow>
  );
}
