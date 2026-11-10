"use client";

import EventSetupSteps from "@/components/event/setup/EventSetupSteps";
import EventAccessSettings from "@/components/event/setup/EventAccessSettings";
import useEventDraft from "@/hooks/useEventDraft";
import EventInformationFields from "@/components/event/setup/EventInformationFields";
import EventSetupActions from "@/components/event/setup/EventSetupActions";
import { useRouter } from "@/i18n/navigation";
import type { EventWorkspace } from "@/types/event/workspace";
import { useTranslations } from "next-intl";
import type { FormEvent } from "react";

interface EventDetailsFormProps {
  workspace: EventWorkspace;
  userId: string;
  locale: string;
}

export default function EventDetailsForm({
  workspace,
  userId,
  locale,
}: EventDetailsFormProps) {
  const t = useTranslations("eventHome.details");
  const router = useRouter();
  const { draft, status, readOnly, change, save } = useEventDraft(
    workspace,
    userId,
    locale,
  );
  const navigate = (href: "/event" | "/event/branding") => {
    if (save()) router.push(href);
  };
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    navigate("/event/branding");
  };

  return (
    <form
      onSubmit={onSubmit}
      className="flex min-h-160 flex-col gap-7 rounded-2xl bg-event-page p-4 sm:p-6 dark:bg-gray-950"
    >
      <header>
        <p className="text-theme-xs font-medium text-event-action dark:text-brand-400">
          {t("step")}
        </p>
        <h1 className="mt-2 text-title-sm font-bold text-gray-900 dark:text-white/90">
          {t("title")}
        </h1>
        <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
          {t("description")}
        </p>
      </header>
      <EventSetupSteps current={1} onNavigate={save} />
      <div className="grid items-start gap-5 lg:grid-cols-5">
        <EventInformationFields
          draft={draft}
          readOnly={readOnly}
          onChange={change}
        />
        <EventAccessSettings
          draft={draft}
          readOnly={readOnly}
          onChange={change}
          onNavigate={save}
        />
      </div>
      <EventSetupActions
        regularWeight
        back={{ label: t("backAction"), onClick: () => navigate("/event") }}
        primary={{ label: t("nextBranding") }}
        error={
          status === "error" || status === "invalid" ? t(status) : undefined
        }
      />
    </form>
  );
}
