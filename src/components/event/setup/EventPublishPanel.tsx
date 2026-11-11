"use client";
import EventSetupBoundary from "@/components/event/setup/EventSetupBoundary";
import type { EventSetupPageProps } from "@/components/event/setup/EventSetupBoundary";
import EventSetupSteps from "@/components/event/setup/EventSetupSteps";
import EventSetupActions from "@/components/event/setup/EventSetupActions";
import PublishFormSummary from "@/components/event/setup/publish/PublishFormSummary";
import PublishParticipantPreview from "@/components/event/setup/publish/PublishParticipantPreview";
import Button from "@/components/ui/button/Button";
import { selectSetupForms } from "@/core/event/form-summary";
import { createSavedNavigation } from "@/core/event/draft";
import useEventFormSummaries from "@/hooks/useEventFormSummaries";
import {
  loadPublication,
  publicationIssues,
  publicationKey,
  savePublication,
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
  const { confirm } = useConfirm();
  const {
    draft,
    save: saveDraft,
    readOnly,
  } = useEventDraft(workspace, userId, locale);
  const { branding, save: saveBranding } = useEventBranding(
    workspace,
    userId,
    locale,
  );
  const formState = useEventFormSummaries(
    workspace.eventId,
    workspace.hasRegistration || workspace.hasSurvey,
  );
  const key = publicationKey(userId, workspace.eventId, locale);
  const forms = selectSetupForms(formState.forms);
  const [published, setPublished] = useState(() => !!loadPublication(key));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const save = () => {
    const ok = saveDraft() && saveBranding();
    setError(!ok);
    return ok;
  };
  const saveBeforeNavigation = () => !busy && save();
  const navigate = createSavedNavigation(saveBeforeNavigation, router.push);
  const publish = async () => {
    if (readOnly || published || busy || workspace.userRole !== "event_owner")
      return;
    setBusy(true);
    try {
      if (!save()) return;
      if (formState.loading || formState.error) {
        setError(true);
        return;
      }
      const issues = publicationIssues(draft, forms);
      if (issues.length) {
        await confirm({
          appearance: "event",
          title: t("errorTitle"),
          subtitle: t("errorSubtitle"),
          message: t("errorBody"),
          note: issues.map((issue) => t(`issues.${issue}`)).join("\n"),
          variant: "danger",
          showCancel: false,
          confirmLabel: t("fix"),
        });
        return;
      }
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
      // Commit one complete local snapshot only after all checks and confirmation.
      if (
        !savePublication(key, {
          publishedAt: new Date().toISOString(),
          draft,
          branding,
          forms,
        })
      ) {
        setError(true);
        return;
      }
      setPublished(true);
      await confirm({
        appearance: "event",
        title: t("successTitle"),
        subtitle: t("successSubtitle"),
        message: t("successBody"),
        note: t("successNote"),
        showCancel: false,
        confirmLabel: t("close"),
      });
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
      className="flex min-h-160 flex-col gap-5 rounded-2xl bg-gray-50 p-4 sm:p-6 dark:bg-gray-950"
    >
      <header className="space-y-2">
        <p className="text-theme-xs font-semibold text-event-action dark:text-brand-400">
          {t("step")}
        </p>
        <h1 className="text-title-sm font-bold text-gray-900 dark:text-gray-100">
          {t("title")}
        </h1>
        <p className="text-base text-gray-500 dark:text-gray-400">
          {t("description")}
        </p>
      </header>
      <EventSetupSteps current={4} onNavigate={saveBeforeNavigation} />
      <div className="grid gap-4 md:grid-cols-2">
        <PublishFormSummary
          type="registration"
          enabled={draft.hasRegistration}
          status={published ? "pending_approval" : forms.registration?.status}
        />
        <PublishFormSummary
          type="survey"
          enabled={draft.hasSurvey}
          status={published ? "pending_approval" : forms.survey?.status}
        />
      </div>
      <PublishParticipantPreview
        draft={draft}
        branding={branding}
        bannerUrl={workspace.bannerUrl}
        onOpen={saveBeforeNavigation}
      />
      <EventSetupActions
        back={{
          label: t("back"),
          disabled: busy,
          onClick: () => navigate("/event/forms"),
        }}
        primary={{
          label: t("publish"),
          wide: true,
          disabled:
            busy ||
            formState.loading ||
            formState.error ||
            published ||
            readOnly ||
            workspace.userRole !== "event_owner",
        }}
        error={
          error || formState.error
            ? t(formState.error ? "formsLoadError" : "storageError")
            : undefined
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
  return <EventSetupBoundary component={PublishPage} />;
}
