"use client";

import EventSetupSteps from "@/components/event/setup/EventSetupSteps";
import EventAccessSettings from "@/components/event/setup/details/EventAccessSettings";
import useEventDraft from "@/hooks/useEventDraft";
import EventInformationFields from "@/components/event/setup/details/EventInformationFields";
import EventSetupActions from "@/components/event/setup/EventSetupActions";
import EventSetupBoundary from "@/components/event/setup/EventSetupBoundary";
import type { EventSetupPageProps } from "@/components/event/setup/EventSetupBoundary";
import { createSavedNavigation } from "@/core/event/draft";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import WhitelistManagementDialog from "@/components/event/whitelist/WhitelistManagementDialog";
import { useModal } from "@/hooks/useModal";
import useWhitelistRequirement from "@/hooks/useWhitelistRequirement";
import { useState } from "react";
import {
  canEditWhitelist,
  getWhitelistRequirement,
  whitelistKey,
} from "@/core/event/whitelist";
import type { FormEvent } from "react";

function DetailsForm({ workspace, userId, locale }: EventSetupPageProps) {
  const t = useTranslations("eventHome.details");
  const router = useRouter();
  const { draft, status, readOnly, change, save } = useEventDraft(
    workspace,
    userId,
    locale,
  );
  const whitelist = useModal();
  const whitelistWorkspace = { ...workspace, ...draft };
  const requirement = useWhitelistRequirement(
    draft,
    userId,
    workspace.eventId,
    locale,
  );
  const [validationAttempted, setValidationAttempted] = useState(false);
  const validateNext = () => {
    const current = getWhitelistRequirement(
      draft,
      whitelistKey(userId, workspace.eventId, locale),
    );
    if (!readOnly && (current === "missing" || current === "error")) {
      setValidationAttempted(true);
      globalThis.document?.getElementById("manage-event-whitelist")?.focus();
      return false;
    }
    return save();
  };
  const navigate = createSavedNavigation(save, router.push);
  const next = createSavedNavigation(validateNext, router.push);
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    next("/event/branding");
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
      <EventSetupSteps current={1} onNavigate={validateNext} />
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
          whitelistReady={requirement === "ready"}
          whitelistInvalid={
            validationAttempted &&
            !readOnly &&
            (requirement === "missing" || requirement === "error")
          }
          whitelistStorageError={requirement === "error"}
          canManageWhitelist={canEditWhitelist(whitelistWorkspace)}
          onManageWhitelist={() => {
            if (save()) whitelist.openModal();
          }}
        />
      </div>
      {whitelist.isOpen && (
        <WhitelistManagementDialog
          workspace={whitelistWorkspace}
          userId={userId}
          locale={locale}
          onClose={whitelist.closeModal}
        />
      )}
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

export default function EventDetailsForm() {
  return <EventSetupBoundary component={DetailsForm} />;
}
