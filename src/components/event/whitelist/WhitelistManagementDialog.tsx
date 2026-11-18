"use client";

import WhitelistDialog from "@/components/event/whitelist/WhitelistDialog";
import WhitelistImportDialog from "@/components/event/whitelist/WhitelistImportDialog";
import WhitelistTable from "@/components/event/whitelist/WhitelistTable";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { useConfirm } from "@/hooks/useConfirm";
import useEventWhitelist from "@/hooks/useEventWhitelist";
import {
  normalizeWhitelistId,
  replaceWhitelist,
  whitelistEntryIssue,
} from "@/core/event/whitelist";
import type { EventSetupPageProps } from "@/components/event/setup/EventSetupBoundary";
import type {
  WhitelistEntry,
  WhitelistRowIssue,
} from "@/types/event/whitelist";
import {
  ArrowUpTrayIcon,
  MagnifyingGlassIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface WhitelistManagementDialogProps extends EventSetupPageProps {
  onClose: () => void;
}

export default function WhitelistManagementDialog({
  workspace,
  userId,
  locale,
  onClose,
}: WhitelistManagementDialogProps) {
  const t = useTranslations("eventWhitelist");
  const { entries, change, save, dirty, readOnly, error } = useEventWhitelist(
    workspace,
    userId,
    locale,
  );
  const { confirm } = useConfirm();
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [uniqueId, setUniqueId] = useState("");
  const [name, setName] = useState("");
  const [issue, setIssue] = useState<WhitelistRowIssue | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [attentionRequest, setAttentionRequest] = useState(0);
  const pending = dirty || (adding && !!(uniqueId || name));
  useEffect(() => {
    if (!pending) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    globalThis.addEventListener("beforeunload", guard);
    return () => globalThis.removeEventListener("beforeunload", guard);
  }, [pending]);
  const close = () => {
    if (confirming) return;
    if (pending) {
      setAttentionRequest((request) => request + 1);
      return;
    }
    onClose();
  };
  const remove = async (entry: WhitelistEntry) => {
    if (readOnly || confirming || entry.status === "joined") return;
    setConfirming(true);
    try {
      if (
        await confirm({
          appearance: "event",
          overModal: true,
          title: t("deleteTitle"),
          message: `${entry.name || entry.uniqueId}\n${entry.uniqueId}\n${t("deleteBody")}`,
          confirmLabel: t("delete"),
          cancelLabel: t("cancel"),
          variant: "danger",
        })
      )
        change(entries.filter((item) => item.id !== entry.id));
    } finally {
      setConfirming(false);
    }
  };
  const add = () => {
    if (readOnly) return;
    const problem = whitelistEntryIssue(uniqueId, entries);
    setIssue(problem);
    if (problem) return;
    change([
      ...entries,
      {
        id: crypto.randomUUID(),
        uniqueId: normalizeWhitelistId(uniqueId),
        name: name.trim(),
        status: "available",
      },
    ]);
    setAdding(false);
    setUniqueId("");
    setName("");
  };
  const query = search.trim().toLowerCase();
  const visible = entries.filter((entry) =>
    `${entry.uniqueId} ${entry.name}`.toLowerCase().includes(query),
  );
  // Portal keeps inline row forms outside the surrounding Event Details form.
  return createPortal(
    importing ? (
      <WhitelistImportDialog
        wide
        entries={entries}
        onClose={() => setImporting(false)}
        onUse={(incoming) => {
          change(replaceWhitelist(entries, incoming));
          setImporting(false);
        }}
      />
    ) : (
      <WhitelistDialog
        title={t("modalTitle")}
        wide
        inactive={confirming}
        attentionRequest={attentionRequest}
        onClose={close}
        footer={
          <>
            <Button
              variant="outline"
              disabled={confirming}
              onClick={onClose}
              className="min-h-11 min-w-28 py-2.5!"
            >
              {t("cancel")}
            </Button>
            <Button
              disabled={readOnly || confirming}
              onClick={
                adding
                  ? add
                  : () => {
                      if (save()) onClose();
                    }
              }
              className="min-h-11 min-w-32 bg-event-action! py-2.5! hover:bg-event-action/90! dark:bg-event-action"
            >
              {t(adding ? "addEntry" : "save")}
            </Button>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button
            disabled={readOnly || adding || confirming}
            onClick={() => setImporting(true)}
            startIcon={
              <ArrowUpTrayIcon className="size-5" aria-hidden="true" />
            }
            className="min-h-11 bg-event-action! py-2.5! hover:bg-event-action/90! dark:bg-event-action"
          >
            {t("import")}
          </Button>
          <Button
            disabled={readOnly || adding || confirming}
            variant="outline"
            onClick={() => {
              setSearch("");
              setAdding(true);
            }}
            startIcon={
              <UserPlusIcon
                className="size-5 text-event-action dark:text-brand-400"
                aria-hidden="true"
              />
            }
            className="min-h-11 py-2.5!"
          >
            {t("addManually")}
          </Button>
          <div className="relative w-full sm:ms-auto sm:w-72">
            <MagnifyingGlassIcon
              className="pointer-events-none absolute start-3 top-3 z-1 size-5 text-gray-500 dark:text-gray-400"
              aria-hidden="true"
            />
            <Input
              aria-label={t("search")}
              placeholder={t("search")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              disabled={adding || confirming}
              className="ps-10"
            />
          </div>
        </div>
        <p
          className="my-3 text-end text-theme-xs font-semibold text-gray-500 dark:text-gray-400"
          aria-live="polite"
        >
          {t("total", { total: entries.length })}
        </p>
        <WhitelistTable
          entries={visible}
          management
          readOnly={readOnly || confirming || adding}
          onDelete={(entry) => void remove(entry)}
          editor={
            adding
              ? {
                  uniqueId,
                  name,
                  error: issue,
                  onUniqueId: (value) => {
                    setUniqueId(value);
                    setIssue(null);
                  },
                  onName: setName,
                  onSubmit: add,
                }
              : undefined
          }
        />
        {error && (
          <p
            role="alert"
            className="mt-3 text-theme-sm text-error-600 dark:text-error-400"
          >
            {t("storageError")}
          </p>
        )}
      </WhitelistDialog>
    ),
    globalThis.document.body,
  );
}
