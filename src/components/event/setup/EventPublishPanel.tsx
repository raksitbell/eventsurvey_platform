"use client";
import EventSetupBoundary from "@/components/event/setup/EventSetupBoundary";
import type { EventSetupPageProps } from "@/components/event/setup/EventSetupBoundary";
import PublishChecklist from "./publish/PublishChecklist";
import { surveyClosingTime } from "@/core/event/schedule";
import { api, ApiError } from "@/core/api";
import { eventSetupStateKey, notifyEventSetupSaved } from "@/core/event/local-events";
import useSetupApiState from "@/hooks/useSetupApiState";
import type { EventSetupState } from "@/types/event/setup";
import { showToast } from "@/utils/alert";
import EventSetupActions from "@/components/event/setup/EventSetupActions";

import PublishParticipantPreview from "@/components/event/setup/publish/PublishParticipantPreview";
import Button from "@/components/ui/button/Button";
import { contentLanguageName } from "@/core/event/content";
import { selectSetupForms } from "@/core/event/form-summary";
import { createSavedNavigation } from "@/core/event/draft";
import useEventFormSummaries from "@/hooks/useEventFormSummaries";
import {
  publicationIssues,
  type PublishIssue,
} from "@/core/event/publication";
import { useConfirm } from "@/hooks/useConfirm";
import useEventDraft from "@/hooks/useEventDraft";
import useEventBranding from "@/hooks/useEventBranding";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
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
  const { branding, save: saveBranding, pendingMediaMessage } = useEventBranding(
    workspace, userId, locale, setupApi,
  );
  const receipt = workspace.setup?.publication ?? null;
  const formState = useEventFormSummaries(
    workspace.eventId,
    !receipt && (draft.hasRegistration || draft.hasSurvey),
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
  const issues = publicationIssues(draft, forms);
  const published = !!receipt;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    const ok = (await saveDraft()) && (await saveBranding());
    setError(ok ? null : s("saveError"));
    return ok;
  };
  const saveBeforeNavigation = () => !busy && save();
  const navigate = createSavedNavigation(saveBeforeNavigation, router.push);
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

      if (issues.length) {
        await confirm({
          appearance: "event",
          title: t("errorTitle"),
          subtitle: t("errorSubtitle"),
          message: t("errorBody"),
          note: issues
            .map((issue) => {
              if (typeof issue === "string") return t(`issues.${issue}`);
              return t(`issues.${issue.key}`, {
                language: contentLanguageName(issue.localeCode, locale),
              });
            })
            .join("\n"),
          variant: "danger",
          showCancel: false,
          confirmLabel: t("fix"),
        });
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
        eventId: workspace.eventId, revision, locale,
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
        setError(s(pendingMediaMessage ?? "mediaAnotherBrowser"));
      } else if (cause instanceof ApiError && cause.code === "SETUP_PUBLISH_IN_PAST") {
        setError(dates("pastDate"));
      } else if (cause instanceof ApiError && cause.code === "SETUP_PUBLISH_INVALID") {
        const issues = (cause.body as { issues?: PublishIssue[] } | undefined)?.issues ?? [];
        setError(issues.map((issue) => typeof issue === "string"
          ? t(`issues.${issue}`)
          : t(`issues.${issue.key}`, { language: contentLanguageName(issue.localeCode, locale) })
        ).join(" ") || t("publishError"));
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
      className="publish-view"
    >
      <header className="publish-heading">
        <h1 className="text-title-sm font-bold">{s("preview")}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {s("previewHint")}
        </p>
      </header>
      <div className="publish-grid">
        <PublishParticipantPreview
          draft={draft}
          branding={branding}
          bannerUrl={workspace.bannerUrl}
          onOpen={saveBeforeNavigation}
        />
        <PublishChecklist
          draft={draft}
          branding={branding}
          issues={issues}
          loading={formState.loading}
          canEdit={!busy && !readOnly && !published}
          onEdit={() => navigate("/event/details")}
        />
      </div>
      <EventSetupActions
        back={{
          label: s("backSetup"),
          disabled: busy || setupApi.pending,
          onClick: () => navigate("/event/details"),
        }}
        saveDraft={{
          label: s("save"),
          disabled: busy || readOnly || setupApi.pending,
          onClick: () => {
            void save().then((saved) => { if (saved) showToast({ title: s("saved") }); });
          },
        }}
        primary={{
          label: s("publish"),
          wide: true,
          disabled:
            busy ||
            setupApi.pending ||
            formState.loading ||
            formState.error ||
            published ||
            readOnly ||
            workspace.userRole !== "event_owner",
        }}
        error={
          setupApi.conflict ? s("draftConflict") : formState.error ? t("formsLoadError") : error ?? undefined
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
