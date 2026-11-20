"use client";

import EventSetupBoundary, { type EventSetupPageProps } from "@/components/event/setup/EventSetupBoundary";
import EventSetupActions from "@/components/event/setup/EventSetupActions";
import PublishParticipantPreview from "@/components/event/setup/publish/PublishParticipantPreview";
import { api, ApiError } from "@/core/api";
import { contentLanguageName, normalizeContentLocale } from "@/core/event/content";
import { createSavedNavigation, type EventDetailIssue } from "@/core/event/draft";
import { detailInputIds, eventSetupStepHref, formBuilderEntryHref, whitelistEntryHref } from "@/core/event/form-builder-navigation";
import { eventSetupStateKey, notifyEventSetupSaved } from "@/core/event/local-events";
import { useConfirm } from "@/hooks/useConfirm";
import useEventBranding from "@/hooks/useEventBranding";
import useEventDraft from "@/hooks/useEventDraft";
import useParticipantPreviewLanguage from "@/hooks/useParticipantPreviewLanguage";
import useSetupApiState from "@/hooks/useSetupApiState";
import { useRouter } from "@/i18n/navigation";
import type { EventSetupState } from "@/types/event/setup";
import { showToast } from "@/utils/alert";
import { useTranslations } from "next-intl";
import { useState } from "react";
import EventWorkspacePageHeader from "../workspace/EventWorkspacePageHeader";

function PublishPage({ workspace, userId, locale }: EventSetupPageProps) {
  const t = useTranslations("eventPublish");
  const s = useTranslations("eventSetup");
  const details = useTranslations("eventHome.details");
  const dates = useTranslations("datePicker");
  const brandingText = useTranslations("eventBranding");
  const router = useRouter();
  const { confirm } = useConfirm();
  const setupApi = useSetupApiState(workspace);
  const { draft, save: saveDraft, readOnly, status: draftStatus } = useEventDraft(workspace, userId, locale, setupApi);
  const { branding, save: saveBranding, mediaSaveError } = useEventBranding(workspace, userId, locale, setupApi);
  const language = useParticipantPreviewLanguage(draft);
  const detailsHref = eventSetupStepHref("details", language.contentLocale);
  const [busy, setBusy] = useState(false);
  const [publishedHere, setPublishedHere] = useState(false);
  const [failure, setFailure] = useState<{ message: string; href?: string } | "save" | null>(null);
  const pending = busy || setupApi.pending;
  const published = publishedHere || !!workspace.setup?.publication;
  const isOwner = workspace.userRole === "event_owner";
  const unavailable = pending || readOnly || published || !isOwner;

  async function save() {
    const saved = (await saveDraft()) && (await saveBranding());
    setFailure(saved ? null : "save");
    return saved;
  }

  const saveBeforeNavigation = () => !pending && save();
  const navigate = createSavedNavigation(saveBeforeNavigation, router.push);
  const backToSetup = {
    label: s("backSetup"),
    disabled: pending,
    onClick: () => void navigate(detailsHref),
  };

  function publishFailure(cause: unknown) {
    if (!(cause instanceof ApiError)) return { message: t("publishError") };
    switch (cause.code) {
      case "SETUP_REGISTRATION_FORM_REQUIRED":
        return {
          message: t("registrationRequired"),
          href: workspace.canManageWhitelist
            ? formBuilderEntryHref("/event/setup/registration", "publish", language.contentLocale)
            : undefined,
        };
      case "SETUP_SURVEY_FORM_REQUIRED":
        return {
          message: t("surveyRequired"),
          href: workspace.canManageSurveyForm
            ? formBuilderEntryHref("/event/setup/survey", "publish", language.contentLocale)
            : undefined,
        };
      case "SETUP_WHITELIST_REQUIRED":
        return {
          message: t("whitelistRequired"),
          href: workspace.canManageWhitelist ? whitelistEntryHref("publish", language.contentLocale) : undefined,
        };
      case "SETUP_EVENT_DETAILS_REQUIRED": {
        const detail = (cause.body as { issues?: EventDetailIssue } | undefined)?.issues;
        if (!detail || !Object.hasOwn(detailInputIds, detail.field)) {
          return { message: t("detailsRequired"), href: detailsHref };
        }
        const contentLocale = normalizeContentLocale(detail.localeCode);
        let message;
        if (detail.field === "surveyCustomClose") message = s("closeError");
        else if (detail.issue === "invalidOrder") message = dates("invalidOrder");
        else message = details(`requiredFields.${detail.field}`);
        if (contentLocale) {
          message += " · " + details("languages.trigger", { language: contentLanguageName(contentLocale, locale) });
        }
        const href = eventSetupStepHref("details", contentLocale ?? language.contentLocale);
        return { message, href: href + "#" + detailInputIds[detail.field] };
      }
      case "SETUP_DRAFT_REQUIRED":
        return { message: t("detailsRequired"), href: detailsHref };
      case "SETUP_MEDIA_PENDING":
        return { message: s("mediaAnotherBrowser"), href: detailsHref + "#event-media" };
      case "SETUP_READ_ONLY":
        return { message: details("readOnly") };
      case "SETUP_CONFLICT":
        return { message: s("draftConflict") };
      case "FORBIDDEN":
        return { message: t("permissionDenied") };
      default:
        return { message: t("publishError") };
    }
  }

  async function publish() {
    if (unavailable) return;
    setBusy(true);
    try {
      if (!(await save())) return;
      const revision = setupApi.getRevision();
      const confirmed = await confirm({
        appearance: "event",
        layout: "standard",
        title: t("confirmTitle"),
        message: t("confirmBody"),
        confirmLabel: t("confirm"),
        cancelLabel: t("cancel"),
      });
      if (!confirmed) return;
      await api.post<EventSetupState>("/event/setup/publish", {
        eventId: workspace.eventId, revision, locale,
      });
      setPublishedHere(true);
      notifyEventSetupSaved(eventSetupStateKey(workspace.eventId));
      const openQr = await confirm({
        appearance: "event",
        layout: "standard",
        variant: "success",
        title: t("successTitle"),
        message: t("successBody"),
        showCancel: false,
        confirmLabel: t("viewQr"),
      });
      if (openQr) router.push("/event/qr");
    } catch (cause) {
      setFailure(publishFailure(cause));
    } finally {
      setBusy(false);
    }
  }

  function saveFailure() {
    if (mediaSaveError) return { message: brandingText(mediaSaveError), href: detailsHref + "#event-media" };
    switch (setupApi.errorCode) {
      case "SETUP_CONFLICT":
        return { message: s("draftConflict") };
      case "SETUP_DATE_IN_PAST":
        return { message: dates("pastDate"), href: detailsHref + "#event-start" };
      case "SETUP_DATE_ORDER":
        return { message: dates("invalidOrder"), href: detailsHref + "#event-end" };
      case "SETUP_SURVEY_CLOSE_INVALID":
        return { message: s("closeError"), href: detailsHref + "#survey-schedule" };
      default:
        return { message: draftStatus === "invalid" ? t("detailsRequired") : s("saveError"), href: detailsHref };
    }
  }

  const feedback = failure === "save" ? saveFailure() : failure;
  const correctionHref = feedback?.href;
  const disabledReason = published ? s("published") : !isOwner ? t("ownerOnly") : readOnly ? details("readOnly") : null;
  return (
    <form
      className="es-setup-form gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void publish();
      }}
    >
      <EventWorkspacePageHeader title={s("preview")} description={s("previewHint")} back={backToSetup} />
      <PublishParticipantPreview
        workspace={workspace}
        draft={draft}
        branding={branding}
        language={language}
        bannerUrl={workspace.bannerUrl}
        disabled={pending}
        onOpen={saveBeforeNavigation}
      />
      <EventSetupActions
        back={backToSetup}
        saveDraft={{
          label: s("save"),
          disabled: pending || readOnly || published,
          onClick: async () => {
            if (await save()) showToast({ title: s("saved") });
          },
        }}
        primary={{ label: s("publish"), wide: true, disabled: unavailable }}
        error={feedback ? {
          title: failure === "save" ? t("saveFailureTitle") : t("publishFailureTitle"),
          message: feedback.message,
          action: correctionHref ? {
            label: t("fix"),
            onClick: () => router.push(correctionHref),
            disabled: pending,
          } : undefined,
        } : undefined}
      >
        {disabledReason && (
          <p role="status" className="text-end text-theme-sm text-gray-700 dark:text-gray-300">
            {disabledReason}
          </p>
        )}
      </EventSetupActions>
    </form>
  );
}

export default function EventPublishPanel() {
  return <EventSetupBoundary recoverDraft component={PublishPage} />;
}
