"use client";
import EventSetupBoundary from "@/components/event/setup/EventSetupBoundary";
import type { EventSetupPageProps } from "@/components/event/setup/EventSetupBoundary";
import PublishChecklist from "./publish/PublishChecklist";
import { surveyClosingTime } from "@/core/event/schedule";
import { showToast } from "@/utils/alert";
import EventSetupActions from "@/components/event/setup/EventSetupActions";

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
  const s = useTranslations("eventSetup");
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
  const key = publicationKey(userId, workspace.eventId, locale);
  const [receipt] = useState(() =>
    workspace.localPublishedAt ? loadPublication(key) : null,
  );
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
  const [published, setPublished] = useState(!!receipt);
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
      router.push("/event/qr");
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
          disabled: busy,
          onClick: () => navigate("/event/details"),
        }}
        saveDraft={{
          label: s("save"),
          disabled: busy || readOnly,
          onClick: () => {
            if (save()) showToast({ title: s("saved") });
          },
        }}
        primary={{
          label: s("publish"),
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
