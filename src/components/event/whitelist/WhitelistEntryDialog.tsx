"use client";
import WhitelistDialog from "@/components/event/whitelist/WhitelistDialog";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import {
  normalizeWhitelistId,
  whitelistEntryIssue,
} from "@/core/event/whitelist";
import type {
  WhitelistEntry,
  WhitelistRowIssue,
} from "@/types/event/whitelist";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
interface WhitelistEntryDialogProps {
  entries: WhitelistEntry[];
  onAdd: (entry: WhitelistEntry) => void;
  onClose: () => void;
}
export default function WhitelistEntryDialog({
  entries,
  onAdd,
  onClose,
}: WhitelistEntryDialogProps) {
  const t = useTranslations("eventWhitelist"),
    id = useId();
  const [uniqueId, setUniqueId] = useState(""),
    [name, setName] = useState("");
  const [error, setError] = useState<WhitelistRowIssue | null>(null);
  return (
    <WhitelistDialog title={t("addTitle")} compact onClose={onClose}>
      <p className="text-theme-sm text-gray-500 dark:text-gray-400">
        {t("addDescription")}
      </p>
      <form
        noValidate
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const issue = whitelistEntryIssue(uniqueId, entries);
          setError(issue);
          if (!issue)
            onAdd({
              id: crypto.randomUUID(),
              uniqueId: normalizeWhitelistId(uniqueId),
              name: name.trim(),
              status: "available",
            });
        }}
      >
        <div>
          <Label htmlFor={`${id}-unique`}>{t("uniqueIdRequired")}</Label>
          <Input
            id={`${id}-unique`}
            type="email"
            value={uniqueId}
            maxLength={500}
            required
            error={!!error}
            onChange={(event) => {
              setUniqueId(event.target.value);
              setError(null);
            }}
          />
        </div>
        <div>
          <Label htmlFor={`${id}-name`}>{t("optionalName")}</Label>
          <Input
            id={`${id}-name`}
            value={name}
            maxLength={500}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <p className="text-theme-xs text-gray-500 dark:text-gray-400">
          {t("dedupHint")}
        </p>
        {error && (
          <p
            role="alert"
            className="text-theme-sm text-error-600 dark:text-error-400"
          >
            {t(`errors.${error}`)}
          </p>
        )}
        <footer className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            {t("cancel")}
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-event-action! hover:bg-event-action/90! dark:bg-event-action"
          >
            {t("addEntry")}
          </Button>
        </footer>
      </form>
    </WhitelistDialog>
  );
}
