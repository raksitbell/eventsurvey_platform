"use client";
import EventSetupBoundary from "@/components/event/setup/EventSetupBoundary";
import EventWorkspacePageHeader from "@/components/event/workspace/EventWorkspacePageHeader";
import type { EventSetupPageProps } from "@/components/event/setup/EventSetupBoundary";
import WhitelistTable from "@/components/event/whitelist/WhitelistTable";
import WhitelistEntryRow from "@/components/event/whitelist/WhitelistEntryRow";
import type { WhitelistEntryDraft } from "@/components/event/whitelist/WhitelistEntryRow";
import WhitelistLoadingSkeleton from "@/components/event/whitelist/WhitelistLoadingSkeleton";
import WhitelistPrerequisite from "@/components/event/whitelist/WhitelistPrerequisite";
import type { WhitelistRowIssue } from "@/types/event/whitelist";
import WhitelistImportDialog from "@/components/event/whitelist/WhitelistImportDialog";
import ErrorPage from "@/components/common/ErrorPage";
import Button from "@/components/ui/button/Button";
import { formBuilderEntryHref, whitelistReturn } from "@/core/event/form-builder-navigation";
import {
  canEditWhitelist,
  whitelistRegistrationBuilderHref,
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
import { useSearchParams } from "next/navigation";
import { useCallback, useId, useRef, useState } from "react";

function WhitelistPage(props: EventSetupPageProps) {
  const t = useTranslations("errors.403");
  if (!canEditWhitelist(props.workspace)) {
    return (
      <ErrorPage
        code="403"
        title={t("title")}
        message={t("message")}
        backLabel={t("backHome")}
        homeHref="/event"
      />
    );
  }
  return <WhitelistPageContent key={props.workspace.eventId} {...props} />;
}

function WhitelistPageContent({ workspace, userId, locale }: EventSetupPageProps) {
  const t = useTranslations("eventWhitelist");
  const editor = useTranslations("form.editorBack");
  const home = useTranslations("eventHome");
  const router = useRouter();
  const query = useSearchParams();
  const contentLocale = query.getAll("lang");
  const destination = whitelistReturn({ from: query.getAll("from"), lang: contentLocale });
  const backLabel = destination.origin === "workspace" ? home("backToOverview") : editor(destination.origin);
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
        id: globalThis.crypto.randomUUID(),
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
    router.push(destination.href);
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
    if (busy || readOnly || entry) return;
    setBusy(true);
    try {
      if (await save()) {
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
  if (loading) return <WhitelistLoadingSkeleton />;

  const builderPath = whitelistRegistrationBuilderHref(workspace);
  const header = (
    <EventWorkspacePageHeader
      eyebrow={view("private")}
      title={view("title")}
      description={view(uniqueField?.type === "email" ? "description" : "descriptionUniqueId")}
      back={{ label: backLabel, onClick: () => void back(), disabled: busy }}
      action={
        !missingUniqueField && (
          <Button disabled={readOnly || busy || !!entry} onClick={() => void persist()} className="es-list-save">
            {t("save")}
          </Button>
        )
      }
    />
  );
  if (missingUniqueField) return (
    <div className="es-list-page">
      {header}
      <WhitelistPrerequisite
        builderHref={builderPath && formBuilderEntryHref(builderPath, "whitelist", contentLocale, destination.origin)}
      />
    </div>
  );
  return (
    <div className="es-list-page" data-inline-edit={entry ? true : undefined}>
      {header}
      <div className="es-list-content">
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
        {entry && (
          <form
            id={formId}
            className="es-list-entry-actions"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              stageEntry();
            }}
          >
            {entryIssue && (
              <p id={formId + "-issue"} role="alert">{t("errors." + entryIssue)}</p>
            )}
            <Button variant="outline" onClick={() => { setEntry(null); setEntryIssue(null); }}>
              {t("cancel")}
            </Button>
            <Button type="submit" className="bg-event-action! text-white!">{t("addEntry")}</Button>
          </form>
        )}
        <p className="es-list-policy">{view("policy")}</p>
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
        {error && (
          <div>
            <p
              role="alert"
              className="text-theme-sm text-error-600 dark:text-error-400"
            >
              {t(error)}
            </p>
            {(error === "loadError" || error === "conflict") && (
              <Button variant="outline" onClick={() => void reloadSavedEntries()}>
                {t("reload")}
              </Button>
            )}
          </div>
        )}
      </div>
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
    </div>
  );
}

export default function EventWhitelistPanel() {
  return <EventSetupBoundary component={WhitelistPage} loadingFallback={<WhitelistLoadingSkeleton />} />;
}
