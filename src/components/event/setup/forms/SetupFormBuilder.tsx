"use client";
import FormBuilder from "@/components/event/form/FormBuilder";
import EventSetupBoundary, {
  type EventSetupPageProps,
} from "@/components/event/setup/EventSetupBoundary";
import { canEditLocalEventSetup } from "@/core/event/draft";
import { Link } from "@/i18n/navigation";
import type { FormType } from "@/types/event/form";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

function Builder({
  workspace,
  type,
}: EventSetupPageProps & { type: FormType }) {
  const t = useTranslations("eventSetup");
  const enabled =
    type === "registration" ? workspace.hasRegistration : workspace.hasSurvey;
  const permitted =
    type === "registration"
      ? workspace.canManageWhitelist
      : workspace.canManageSurveyForm;
  return (
    <section className="event-sheet space-y-4">
      <Link
        href="/event/details"
        className="event-option inline-flex items-center gap-2"
      >
        <ArrowLeftIcon className="size-4 rtl:rotate-180" />
        {t("backSetup")}
      </Link>
      {enabled && permitted && canEditLocalEventSetup(workspace) && (
        <FormBuilder type={type} />
      )}
    </section>
  );
}
function Registration(props: EventSetupPageProps) {
  return <Builder {...props} type="registration" />;
}
function Survey(props: EventSetupPageProps) {
  return <Builder {...props} type="survey" />;
}
export default function SetupFormBuilder({ type }: { type: FormType }) {
  return (
    <EventSetupBoundary
      component={type === "registration" ? Registration : Survey}
    />
  );
}
