"use client";
import EventSetupBoundary from "@/components/event/setup/EventSetupBoundary";
import type { EventSetupPageProps } from "@/components/event/setup/EventSetupBoundary";
import SetupFormCard from "@/components/event/setup/forms/SetupFormCard";
import EventSetupSteps from "@/components/event/setup/EventSetupSteps";
import EventSetupActions from "@/components/event/setup/EventSetupActions";
import useEventFormSummaries from "@/hooks/useEventFormSummaries";
import Button from "@/components/ui/button/Button";
import useEventDraft from "@/hooks/useEventDraft";
import { useRouter } from "@/i18n/navigation";
import { createSavedNavigation } from "@/core/event/draft";
import { selectSetupForms } from "@/core/event/form-summary";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
function FormsSetup({ workspace, userId, locale }: EventSetupPageProps) {
  const t = useTranslations("eventForms");
  const router = useRouter();
  const { draft, save, status } = useEventDraft(workspace, userId, locale);
  const { forms, loading, error, retry } = useEventFormSummaries(
    workspace.eventId,
    workspace.hasRegistration || workspace.hasSurvey,
  );
  const navigate = createSavedNavigation(save, router.push);
  const { registration, survey } = selectSetupForms(forms);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        navigate("/event/publish");
      }}
      className="flex min-h-160 flex-col gap-6 rounded-2xl bg-event-page p-4 sm:p-6 dark:bg-gray-950"
    >
      <h1 className="text-title-sm font-bold text-gray-900 dark:text-white/90">
        {t("title")}
      </h1>
      <EventSetupSteps current={3} onNavigate={save} />
      <div
        aria-busy={loading}
        className="grid items-stretch gap-2 rounded-xl bg-white p-4 lg:grid-cols-[1fr_auto_1fr] lg:p-6 dark:bg-gray-900"
      >
        <SetupFormCard
          type="registration"
          enabled={draft.hasRegistration}
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
          status={survey?.status}
          count={survey?.questions.length ?? 0}
        />
      </div>
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
        back={{ label: t("back"), onClick: () => navigate("/event/branding") }}
        primary={{ label: t("next") }}
        error={
          status === "error" || status === "invalid"
            ? t("storageError")
            : undefined
        }
      />
    </form>
  );
}
export default function EventFormsSetup() {
  return <EventSetupBoundary component={FormsSetup} />;
}
