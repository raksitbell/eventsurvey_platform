"use client";
import EventSetupBoundary from "@/components/event/setup/EventSetupBoundary";
import type { EventSetupPageProps } from "@/components/event/setup/EventSetupBoundary";
import SetupFormCard from "@/components/event/setup/forms/SetupFormCard";
import SetupFormsLoadingSkeleton from "@/components/event/setup/forms/SetupFormsLoadingSkeleton";
import EventSetupSteps from "@/components/event/setup/EventSetupSteps";
import EventSetupActions from "@/components/event/setup/EventSetupActions";
import EventWorkspacePageHeader from "../workspace/EventWorkspacePageHeader";
import useEventFormSummaries from "@/hooks/useEventFormSummaries";
import Button from "@/components/ui/button/Button";
import useEventDraft from "@/hooks/useEventDraft";
import useSetupApiState from "@/hooks/useSetupApiState";
import { useRouter } from "@/i18n/navigation";
import { createSavedNavigation } from "@/core/event/draft";
import { selectSetupForms } from "@/core/event/form-summary";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
function FormsSetup({ workspace, userId, locale }: EventSetupPageProps) {
  const t = useTranslations("eventForms");
  const setupText = useTranslations("eventSetup");
  const router = useRouter();
  const setup = useSetupApiState(workspace);
  const { draft, save, status, readOnly } = useEventDraft(
    workspace,
    userId,
    locale,
    setup,
  );
  const { forms, loading, error, retry } = useEventFormSummaries(
    workspace.eventId,
    draft.hasRegistration || draft.hasSurvey,
  );
  const navigate = createSavedNavigation(save, router.push);
  const { registration, survey } = selectSetupForms(forms);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void navigate("/event/publish");
      }}
      aria-busy={setup.pending}
      className="es-setup-form gap-6 bg-event-page dark:bg-gray-950"
    >
      <EventWorkspacePageHeader
        title={t("title")}
        description={t("description")}
        back={{
          onClick: () => void navigate("/event"),
          disabled: setup.pending,
        }}
      />
      <EventSetupSteps current={3} onNavigate={() => !setup.pending && save()} />
      {loading ? (
        <SetupFormsLoadingSkeleton label={t("loading")} />
      ) : (
        <div className="grid items-stretch gap-2 rounded-xl bg-white p-4 lg:grid-cols-[1fr_auto_1fr] lg:p-6 dark:bg-gray-900">
          <SetupFormCard
            type="registration"
            enabled={draft.hasRegistration}
            onOpen={
              !readOnly && !setup.pending && workspace.canManageWhitelist
                ? () => void navigate("/event/setup/registration")
                : undefined
            }
            status={registration?.status}
            count={registration?.questions.length ?? 0}
          />
          <div className="flex w-full items-center justify-center lg:w-20">
            {draft.hasRegistration &&
              draft.hasSurvey &&
              draft.surveyAccess === "registered_only" && (
                <ArrowRightIcon
                  aria-label={t("dependency")}
                  className="size-8 rotate-90 text-event-action lg:rotate-0 rtl:lg:rotate-180 dark:text-brand-400"
                />
              )}
          </div>
          <SetupFormCard
            type="survey"
            enabled={draft.hasSurvey}
            onOpen={
              !readOnly && !setup.pending && workspace.canManageSurveyForm
                ? () => void navigate("/event/setup/survey")
                : undefined
            }
            status={survey?.status}
            count={survey?.questions.length ?? 0}
          />
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="flex items-center gap-3 text-theme-sm text-error-600 dark:text-error-400"
        >
          {t("loadError")}
          <Button onClick={retry}>{t("retry")}</Button>
        </div>
      )}
      <EventSetupActions
        back={{
          label: t("back"),
          onClick: () => void navigate("/event/branding"),
          disabled: setup.pending,
        }}
        primary={{ label: t("next"), disabled: setup.pending }}
        error={
          setup.conflict
            ? setupText("draftConflict")
            : status === "error" || status === "invalid"
              ? setupText("saveError")
              : undefined
        }
      />
    </form>
  );
}
export default function EventFormsSetup() {
  return <EventSetupBoundary recoverDraft component={FormsSetup} />;
}
