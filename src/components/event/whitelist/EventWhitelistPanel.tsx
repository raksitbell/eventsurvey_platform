"use client";
import EventSetupBoundary from "@/components/event/setup/EventSetupBoundary";
import type { EventSetupPageProps } from "@/components/event/setup/EventSetupBoundary";
import WhitelistTable from "@/components/event/whitelist/WhitelistTable";
import WhitelistEntryRow from "@/components/event/whitelist/WhitelistEntryRow";
import type { WhitelistEntryDraft } from "@/components/event/whitelist/WhitelistEntryRow";
import type { WhitelistRowIssue } from "@/types/event/whitelist";
import WhitelistImportDialog from "@/components/event/whitelist/WhitelistImportDialog";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import {
  replaceWhitelist,
  normalizeWhitelistId,
  whitelistEntryIssue,
} from "@/core/event/whitelist";
import useEventWhitelist from "@/hooks/useEventWhitelist";
import { useModal } from "@/hooks/useModal";
import { useConfirm } from "@/hooks/useConfirm";
import useWhitelistNavigationGuard from "@/hooks/useWhitelistNavigationGuard";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useId, useRef, useState } from "react";
type WhitelistPageProps = EventSetupPageProps & { onClose?: () => void };

export function WhitelistPage(props: WhitelistPageProps) {
  const { userId, workspace, locale } = props;
  return (
    <WhitelistPageContent
      key={JSON.stringify([userId, workspace.eventId, locale])}
      {...props}
    />
  );
}

function WhitelistPageContent({
  workspace,
  userId,
  locale,
  onClose,
}: WhitelistPageProps) {
  const t = useTranslations("eventWhitelist"),
    router = useRouter();
  const view = useTranslations("eventWhitelistDesign");
  const {
    entries,
    change,
    save,
    reload,
    readOnly,
    dirty,
    error,
    loading,
    uniqueField,
    missingUniqueField,
    recovery,
    recovering,
    restore,
  } = useEventWhitelist(workspace, userId, locale);
  const upload = useModal();
  const formId = useId();
  const [entry, setEntry] = useState<WhitelistEntryDraft | null>(null);
  const [entryIssue, setEntryIssue] = useState<WhitelistRowIssue | null>(null);
  const pendingDialog = useRef(false);
  const labels = useTranslations("eventWhitelistImport");
  const hasChanges = dirty || Boolean(entry?.uniqueId || entry?.name);
  const stageEntry = () => {
    if (!entry || readOnly || !uniqueField) return;
    const issue = whitelistEntryIssue(entry.uniqueId, entries, uniqueField);
    setEntryIssue(issue);
    if (issue) return;
    change([
      ...entries,
      {
        id: crypto.randomUUID(),
        uniqueId: normalizeWhitelistId(entry.uniqueId, uniqueField.type),
        name: entry.name.trim(),
        status: "available",
      },
    ]);
    setEntry(null);
  };
  const { confirm } = useConfirm();
  const [busy, setBusy] = useState(false);
  const confirmDiscard = useCallback(async () => {
    if (pendingDialog.current) return false;
    pendingDialog.current = true;
    try {
      return await confirm({
        title: t("unsavedTitle"),
        message: t("unsavedBody"),
        confirmLabel: t("leave"),
        cancelLabel: t("cancel"),
        variant: "warning",
        appearance: "event",
      });
    } finally {
      pendingDialog.current = false;
    }
  }, [confirm, t]);
  useWhitelistNavigationGuard(hasChanges, confirmDiscard);

  const back = async () => {
    if (pendingDialog.current || (hasChanges && !(await confirmDiscard())))
      return;
    if (onClose) onClose();
    else router.push("/event/details");
  };
  const remove = async (id: string) => {
    const target = entries.find((item) => item.id === id);
    if (
      readOnly ||
      pendingDialog.current ||
      !target ||
      target.status === "joined"
    )
      return;
    pendingDialog.current = true;
    try {
      if (
        await confirm({
          appearance: "event",
          title: labels("deleteTitle"),
          subtitle: target.name,
          message: target.uniqueId,
          note: labels(
            uniqueField?.type === "email" ? "deleteBody" : "deleteBodyUniqueId",
          ),
          confirmLabel: labels("delete"),
          cancelLabel: t("cancel"),
        })
      )
        change(entries.filter((item) => item.id !== id));
    } finally {
      pendingDialog.current = false;
    }
  };
  const persist = async () => {
    if (busy || readOnly) return;
    setBusy(true);
    try {
      if (await save()) {
        if (onClose) {
          onClose();
          return;
        }
        await confirm({
          appearance: "event",
          title: t("savedTitle"),
          message: t("savedBody"),
          confirmLabel: t("close"),
          showCancel: false,
        });
      }
    } finally {
      setBusy(false);
    }
  };
  const reloadSavedEntries = async () => {
    if (hasChanges && !(await confirmDiscard())) return;
    setEntry(null);
    setEntryIssue(null);
    reload();
  };
  const stageRecovery = async () => {
    if (pendingDialog.current || !recovery || readOnly) return;
    pendingDialog.current = true;
    try {
      if (
        await confirm({
          appearance: "event",
          title: t("recoverTitle"),
          message: t("recoverBody", {
            count: recovery.matches,
            unresolved: recovery.unresolved,
          }),
          confirmLabel: t("recover"),
          cancelLabel: t("cancel"),
        })
      )
        restore();
    } finally {
      pendingDialog.current = false;
    }
  };
  const dialogs = (
    <>
      {upload.isOpen && !readOnly && uniqueField && (
        <WhitelistImportDialog
          entries={entries}
          uniqueField={uniqueField}
          onClose={upload.closeModal}
          onUse={(incoming) => {
            change(replaceWhitelist(entries, incoming));
            upload.closeModal();
          }}
        />
      )}
    </>
  );
  const content = (
    <div className="es-list-page" data-inline-edit={entry ? true : undefined}>
      <div className="es-list-content">
        <header className="es-list-heading">
          <div>
            <h1 id="setup-whitelist-title">{view("title")}</h1>
            <p>
              {view(
                uniqueField?.type === "email"
                  ? "description"
                  : "descriptionUniqueId",
              )}
            </p>
          </div>
          <span className="es-list-private">{view("private")}</span>
          {onClose && (
            <button
              type="button"
              className="es-list-close"
              aria-label={t("close")}
              onClick={() => void back()}
            />
          )}
        </header>
        <WhitelistTable
          entries={entries}
          uniqueKind={uniqueField?.type}
          readOnly={readOnly || busy || !!entry}
          onImport={upload.openModal}
          onAdd={() => {
            setEntryIssue(null);
            setEntry({ uniqueId: "", name: "" });
          }}
          editor={
            entry &&
            uniqueField && (
              <WhitelistEntryRow
                formId={formId}
                value={entry}
                issue={entryIssue}
                uniqueKind={uniqueField.type}
                onChange={(value) => {
                  setEntry(value);
                  setEntryIssue(null);
                }}
              />
            )
          }
          onDelete={(id) => void remove(id)}
        />
        <p className="es-list-policy">{view("policy")}</p>
      </div>
      {recovery &&
        !readOnly &&
        !busy &&
        !recovering &&
        !entry &&
        (recovery.matches > 0 ? (
          <Button variant="outline" onClick={() => void stageRecovery()}>
            {t("recover")}
          </Button>
        ) : (
          <p role="status">{t("recoverNoMatch")}</p>
        ))}
      {recovering && <p role="status">{t("recoverStaged")}</p>}
      {loading && <p role="status">{t("loading")}</p>}
      {(error || missingUniqueField) && (
        <div>
          <p
            role="alert"
            className="text-theme-sm text-error-600 dark:text-error-400"
          >
            {t(error ?? "missingUniqueField")}
          </p>
          {(error === "loadError" || error === "conflict") && (
            <Button variant="outline" onClick={() => void reloadSavedEntries()}>
              {t("reload")}
            </Button>
          )}
        </div>
      )}
      {entry ? (
        <form
          id={formId}
          className="es-list-footer whitelist-inline-footer"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            stageEntry();
          }}
        >
          {entryIssue && (
            <p id={formId + "-issue"} role="alert">
              {t("errors." + entryIssue)}
            </p>
          )}
          <Button
            variant="outline"
            onClick={() => {
              setEntry(null);
              setEntryIssue(null);
            }}
          >
            {t("cancel")}
          </Button>
          <Button type="submit" className="bg-event-action! text-white!">
            {t("addEntry")}
          </Button>
        </form>
      ) : (
        <footer className="es-list-footer">
          <Button disabled={busy} variant="outline" onClick={() => void back()}>
            {t(onClose ? "cancel" : "back")}
          </Button>
          <Button
            disabled={readOnly || busy}
            onClick={() => void persist()}
            className="es-list-save bg-event-action! hover:bg-event-action/90!"
          >
            {t("save")}
          </Button>
        </footer>
      )}
      {dialogs}
    </div>
  );
  if (onClose && !upload.isOpen)
    return (
      <Modal
        isOpen
        onClose={() => void back()}
        labelledBy="setup-whitelist-title"
        className="es-list-modal"
        showCloseButton={false}
        backdropClassName="bg-black/50"
      >
        {content}
      </Modal>
    );
  if (onClose && upload.isOpen) return dialogs;
  return content;
}
export default function EventWhitelistPanel() {
  return <EventSetupBoundary component={WhitelistPage} />;
}
