"use client";
import EventSetupBoundary from "@/components/event/setup/EventSetupBoundary";
import type { EventSetupPageProps } from "@/components/event/setup/EventSetupBoundary";
import PublishChecklist from "./publish/PublishChecklist";
import EventWorkspacePageHeader from "../workspace/EventWorkspacePageHeader";
import { publicationPastDates, surveyClosingTime } from "@/core/event/schedule";
import { api, ApiError } from "@/core/api";
import {
  eventSetupStateKey,
  notifyEventSetupSaved,
} from "@/core/event/local-events";
import useSetupApiState from "@/hooks/useSetupApiState";
import type { EventSetupState } from "@/types/event/setup";
import { showToast } from "@/utils/alert";
import EventSetupActions from "@/components/event/setup/EventSetupActions";

import PublishParticipantPreview from "@/components/event/setup/publish/PublishParticipantPreview";
import Button from "@/components/ui/button/Button";
import { selectSetupForms } from "@/core/event/form-summary";
import { createSavedNavigation } from "@/core/event/draft";
import { eventSetupStepHref } from "@/core/event/form-builder-navigation";
import useEventFormSummaries from "@/hooks/useEventFormSummaries";
import useParticipantPreviewLanguage from "@/hooks/useParticipantPreviewLanguage";
import { reviewPublication, type PublishIssue } from "@/core/event/publication";
import { useConfirm } from "@/hooks/useConfirm";
import useEventDraft from "@/hooks/useEventDraft";
import useEventBranding from "@/hooks/useEventBranding";
import { useRouter } from "@/i18n/navigation";
import { useNow, useTranslations } from "next-intl";
import { useState } from "react";
function PublishPage({ workspace, userId, locale }: EventSetupPageProps) {
  const t = useTranslations("eventPublish");
  const router = useRouter();
  const s = useTranslations("eventSetup");
  const dates = useTranslations("datePicker");
  const { confirm } = useConfirm();
  const setupApi = useSetupApiState(workspace);
  const {
    draft,
    save: saveDraft,
    readOnly,
  } = useEventDraft(workspace, userId, locale, setupApi);
  const {
    branding,
    save: saveBranding,
    pendingMediaMessage,
  } = useEventBranding(workspace, userId, locale, setupApi);
  const receipt = workspace.setup?.publication ?? null;
  const now = useNow({ updateInterval: receipt ? undefined : 30_000 });
  const pastDates = publicationPastDates(draft, now.getTime());
  const previewLanguage = useParticipantPreviewLanguage(draft);
  const formState = useEventFormSummaries(
    workspace.eventId,
    !receipt && (draft.hasRegistration || draft.hasSurvey),
    !!workspace.canEditEvent,
  );
  const { registration, survey } = selectSetupForms(formState.forms);
  const forms = receipt?.forms ?? {
    registration:
      draft.hasRegistration && registration
        ? { ...registration, opensAt: draft.startsAt, closesAt: draft.endsAt }
        : null,
    survey:
      draft.hasSurvey && survey
        ? {
            ...survey,
            opensAt: draft.startsAt,
            closesAt: surveyClosingTime(draft),
          }
        : null,
  };
  const { issues, formProblems } = reviewPublication(
    draft,
    forms,
    receipt ? undefined : formState.forms,
    formState.restrictedForms,
  );
  const [validation, setValidation] = useState<{
    revision: number;
    issues?: PublishIssue[];
    pastStart?: boolean;
    pastEnd?: boolean;
    pendingMedia?: boolean;
  } | null>(null);
  const currentValidation =
    validation?.revision === (workspace.setup?.revision ?? 0)
      ? validation
      : null;
  const reviewIssues = receipt
    ? []
    : [
        ...issues,
        ...(currentValidation?.issues ?? []).filter(
          (item) =>
            !issues.some((issue) =>
              typeof issue === "string" || typeof item === "string"
                ? issue === item
                : issue.key === item.key &&
                  issue.localeCode === item.localeCode,
            ),
        ),
      ];
  const mediaWarning =
    !receipt &&
    (pendingMediaMessage ||
      currentValidation?.pendingMedia ||
      Object.entries(workspace.setup?.pendingMedia ?? {}).some(
        ([code, entries]) => code !== locale && entries.length > 0,
      ))
      ? s(pendingMediaMessage ?? "mediaAnotherBrowser")
      : undefined;
  const pastStart = !receipt && (pastDates.pastStart || currentValidation?.pastStart);
  const pastEnd = !receipt && (pastDates.pastEnd || currentValidation?.pastEnd);
  const blocked =
    reviewIssues.length > 0 ||
    !!mediaWarning ||
    pastStart || pastEnd;
  const published = !!receipt;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    const ok = (await saveDraft()) && (await saveBranding());
    setError(ok ? null : s("saveError"));
    return ok;
  };
  const pending = busy || setupApi.pending;
  const canEdit = !pending && !readOnly && !published;
  const saveBeforeNavigation = () => !pending && save();
  const navigate = createSavedNavigation(saveBeforeNavigation, router.push);
  const backToSetup = {
    label: s("backSetup"),
    disabled: pending,
    onClick: () => void navigate(eventSetupStepHref("details", previewLanguage.contentLocale)),
  };
  const publish = async () => {
    if (readOnly || published || busy || workspace.userRole !== "event_owner")
      return;
    setBusy(true);
    try {
      if (!(await save())) return;
      if (formState.loading || formState.error) {
        setError(t("formsLoadError"));
        return;
      }

      if (blocked) {
        globalThis.document
          ?.querySelector<HTMLElement>(
            ".publish-checklist :is([data-status='missing'], [data-status='needs-edit'], [data-status='blocked']):enabled",
          )
          ?.focus();
        return;
      }
      const revision = setupApi.getRevision();
      if (
        !(await confirm({
          appearance: "event",
          title: t("confirmTitle"),
          subtitle: t("confirmSubtitle"),
          message: t("confirmBody"),
          note: t("confirmNote"),
          confirmLabel: t("confirm"),
          cancelLabel: t("cancel"),
        }))
      )
        return;
      await api.post<EventSetupState>("/event/setup/publish", {
        eventId: workspace.eventId,
        revision,
        locale,
      });
      notifyEventSetupSaved(eventSetupStateKey(workspace.eventId));
      await confirm({
        appearance: "event",
        title: t("successTitle"),
        subtitle: t("successSubtitle"),
        message: t("successBody"),
        note: t("successNote"),
        showCancel: false,
        confirmLabel: t("close"),
      });
      router.push("/event/qr");
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === "SETUP_MEDIA_PENDING") {
        setValidation({ revision: setupApi.getRevision(), pendingMedia: true });
      } else if (
        cause instanceof ApiError &&
        cause.code === "SETUP_PUBLISH_IN_PAST"
      ) {
        setValidation({
          revision: setupApi.getRevision(),
          ...publicationPastDates(draft, Date.now()),
        });
      } else if (
        cause instanceof ApiError &&
        cause.code === "SETUP_PUBLISH_INVALID"
      ) {
        const issues =
          (cause.body as { issues?: PublishIssue[] } | undefined)?.issues ?? [];
        // The forms API can change while this page is open. Refresh its per-form results.
        setValidation({
          revision: setupApi.getRevision(),
          issues: issues.filter(
            (issue) => issue !== "formStatus" && issue !== "formContent" && issue !== "uniqueField",
          ),
        });
        formState.retry();
        notifyEventSetupSaved(eventSetupStateKey(workspace.eventId));
        if (!issues.length) setError(t("publishError"));
      } else if (cause instanceof ApiError && cause.status === 409) {
        setError(s("draftConflict"));
      } else {
        setError(t("publishError"));
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void publish();
      }}
      className="es-setup-form publish-view"
    >
      <EventWorkspacePageHeader
        title={s("preview")}
        description={s("previewHint")}
        back={backToSetup}
      />
      <div className="publish-grid">
        <PublishParticipantPreview
          workspace={workspace}
          formState={!receipt && workspace.canAccessForms ? formState : undefined}
          draft={draft}
          branding={branding}
          language={previewLanguage}
          bannerUrl={workspace.bannerUrl}
          disabled={pending}
          onOpen={saveBeforeNavigation}
        />
        <PublishChecklist
          draft={draft}
          branding={branding}
          issues={reviewIssues}
          forms={forms}
          restrictedForms={formState.restrictedForms}
          unreviewable={formState.unreviewable}
          language={previewLanguage}
          mediaWarning={mediaWarning}
          startWarning={pastStart ? dates("pastDate") : undefined}
          endWarning={pastEnd ? dates("pastDate") : undefined}
          formProblems={formProblems}
          checking={formState.loading}
          loadFailed={formState.error}
          canManageRegistration={!!workspace.canManageWhitelist}
          canManageSurvey={!!workspace.canManageSurveyForm}
          canEdit={canEdit}
          onEdit={navigate}
        />
      </div>
      <EventSetupActions
        back={backToSetup}
        saveDraft={{
          label: s("save"),
          disabled: busy || readOnly || setupApi.pending,
          onClick: () => {
            void save().then((saved) => {
              if (saved) showToast({ title: s("saved") });
            });
          },
        }}
        primary={{
          label: s("publish"),
          wide: true,
          disabled:
            busy ||
            setupApi.pending ||
            blocked ||
            formState.loading ||
            formState.error ||
            published ||
            readOnly ||
            workspace.userRole !== "event_owner",
        }}
        error={
          setupApi.conflict
            ? s("draftConflict")
            : formState.error
              ? t("formsLoadError")
              : (error ?? undefined)
        }
      >
        {formState.error && (
          <div className="flex justify-end">
            <Button variant="outline" onClick={formState.retry}>
              {t("retry")}
            </Button>
          </div>
        )}
      </EventSetupActions>
    </form>
  );
}
export default function EventPublishPanel() {
  return <EventSetupBoundary recoverDraft component={PublishPage} />;
}
