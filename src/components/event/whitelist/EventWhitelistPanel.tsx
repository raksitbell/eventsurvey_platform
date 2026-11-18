"use client";
import EventSetupBoundary from "@/components/event/setup/EventSetupBoundary";
import type { EventSetupPageProps } from "@/components/event/setup/EventSetupBoundary";
import WhitelistTable from "@/components/event/whitelist/WhitelistTable";
import WhitelistEntryDialog from "@/components/event/whitelist/WhitelistEntryDialog";
import WhitelistImportDialog from "@/components/event/whitelist/WhitelistImportDialog";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { replaceWhitelist } from "@/core/event/whitelist";
import useEventWhitelist from "@/hooks/useEventWhitelist";
import { useModal } from "@/hooks/useModal";
import { useConfirm } from "@/hooks/useConfirm";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
export function WhitelistPage({
  workspace,
  userId,
  locale,
  onClose,
}: EventSetupPageProps & { onClose?: () => void }) {
  const t = useTranslations("eventWhitelist"),
    router = useRouter();
  const { entries, change, save, readOnly, dirty, error } = useEventWhitelist(
    workspace,
    userId,
    locale,
  );
  const add = useModal(),
    upload = useModal();
  const { confirm } = useConfirm();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!dirty) return;
    // MDN: event.preventDefault() is the standard way to trigger the browser
    // unsaved-changes prompt. event.returnValue is deprecated in lib.dom.d.ts.
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    globalThis.addEventListener("beforeunload", beforeUnload);
    return () => globalThis.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);
  const back = async () => {
    if (
      !dirty ||
      (await confirm({
        title: t("unsavedTitle"),
        message: t("unsavedBody"),
        confirmLabel: t("leave"),
        cancelLabel: t("cancel"),
        variant: "warning",
      }))
    ) {
      if (onClose) onClose();
      else router.push("/event/details");
    }
  };
  const persist = async () => {
    if (busy || readOnly) return;
    setBusy(true);
    try {
      if (save()) {
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
  const dialogs = (
    <>
      {add.isOpen && !readOnly && (
        <WhitelistEntryDialog
          entries={entries}
          onClose={add.closeModal}
          onAdd={(entry) => {
            change([...entries, entry]);
            add.closeModal();
          }}
        />
      )}
      {upload.isOpen && !readOnly && (
        <WhitelistImportDialog
          entries={entries}
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
    <div className="flex min-h-96 flex-col gap-4 rounded-2xl bg-participant-page p-4 sm:p-6 dark:bg-gray-950">
      <header className="space-y-1.5">
        <p className="text-theme-xs font-bold text-event-action dark:text-brand-400">
          {t("eyebrow")}
        </p>
        <h1
          id="setup-whitelist-title"
          className="text-title-sm font-bold text-gray-900 dark:text-gray-100"
        >
          {t("title")}
        </h1>
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">
          {t("description")}
        </p>
      </header>
      <div className="flex flex-wrap items-center gap-4 py-1">
        <Button
          disabled={readOnly || busy}
          onClick={upload.openModal}
          className="min-w-48 bg-event-action! hover:bg-event-action/90! dark:bg-event-action"
        >
          {t("import")}
        </Button>
        <Button
          disabled={readOnly || busy}
          variant="outline"
          onClick={add.openModal}
        >
          {t("addManually")}
        </Button>
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">
          {t("uniqueKind")}
        </p>
      </div>
      <WhitelistTable
        entries={entries}
        onDelete={
          readOnly
            ? undefined
            : (id) =>
                change(
                  entries.filter(
                    (entry) => entry.id !== id || entry.status === "joined",
                  ),
                )
        }
      />
      {error && (
        <p
          role="alert"
          className="text-theme-sm text-error-600 dark:text-error-400"
        >
          {t("storageError")}
        </p>
      )}
      <footer className="mt-auto flex flex-wrap justify-end gap-3 pt-12">
        <Button disabled={busy} variant="outline" onClick={() => void back()}>
          {t(onClose ? "cancel" : "back")}
        </Button>
        <Button
          disabled={readOnly || busy}
          onClick={() => void persist()}
          className="min-w-48 bg-event-action! hover:bg-event-action/90! dark:bg-event-action"
        >
          {t("save")}
        </Button>
      </footer>
      {dialogs}
    </div>
  );
  if (onClose && !add.isOpen && !upload.isOpen)
    return (
      <Modal
        isOpen
        onClose={() => void back()}
        labelledBy="setup-whitelist-title"
        className="max-h-full max-w-4xl overflow-y-auto"
      >
        {content}
      </Modal>
    );
  if (onClose && (add.isOpen || upload.isOpen)) return dialogs;
  return content;
}
export default function EventWhitelistPanel() {
  return <EventSetupBoundary component={WhitelistPage} />;
}
