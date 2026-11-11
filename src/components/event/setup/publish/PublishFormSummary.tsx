"use client";
import { setupFormStatus } from "@/core/event/form-summary";
import type { FormStatus, FormType } from "@/types/event/form";
import { useTranslations } from "next-intl";
interface PublishFormSummaryProps {
  type: FormType;
  enabled: boolean;
  status?: FormStatus;
}
export default function PublishFormSummary({
  type,
  enabled,
  status,
}: PublishFormSummaryProps) {
  const t = useTranslations("eventPublish");
  const forms = useTranslations("eventForms");
  return (
    <section className="rounded-2xl border border-event-border bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
      <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
        {forms(type)}
      </h2>
      <p className="mt-2 text-theme-sm text-gray-500 dark:text-gray-400">
        {t(enabled ? `${type}Summary` : "disabledSummary", {
          status: forms(setupFormStatus(status)),
        })}
      </p>
    </section>
  );
}
