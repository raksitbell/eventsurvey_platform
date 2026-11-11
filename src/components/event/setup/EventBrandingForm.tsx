"use client";

import BrandingAppearance from "@/components/event/setup/branding/BrandingAppearance";
import BrandingPreview from "@/components/event/setup/branding/BrandingPreview";
import EventSetupSteps from "@/components/event/setup/EventSetupSteps";
import EventSetupActions from "@/components/event/setup/EventSetupActions";
import EventSetupBoundary from "@/components/event/setup/EventSetupBoundary";
import type { EventSetupPageProps } from "@/components/event/setup/EventSetupBoundary";
import { createSavedNavigation } from "@/core/event/draft";
import useEventBranding from "@/hooks/useEventBranding";
import useEventDraft from "@/hooks/useEventDraft";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

function BrandingForm({ workspace, userId, locale }: EventSetupPageProps) {
  const t = useTranslations("eventBranding");
  const detailsText = useTranslations("eventHome.details");
  const router = useRouter();
  const {
    draft,
    save: saveDetails,
    status: detailsStatus,
  } = useEventDraft(workspace, userId, locale);
  const { branding, status, readOnly, change, save } = useEventBranding(
    workspace,
    userId,
    locale,
  );
  const saveAll = () => saveDetails() && save();
  const navigate = createSavedNavigation(saveAll, router.push);
  const error =
    detailsStatus === "error" || detailsStatus === "invalid"
      ? detailsText(detailsStatus)
      : status === "error" || status === "invalid"
        ? t(status)
        : undefined;
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        navigate("/event/forms");
      }}
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
      <EventSetupSteps current={2} onNavigate={saveAll} />
      <div className="grid rounded-2xl bg-white lg:grid-cols-3 dark:bg-gray-900">
        <BrandingAppearance
          branding={branding}
          readOnly={readOnly}
          onChange={change}
        />
        <div className="min-w-0 lg:col-span-2">
          <BrandingPreview
            branding={branding}
            draft={draft}
            bannerUrl={workspace.bannerUrl}
            onOpen={saveAll}
          />
        </div>
      </div>
      <EventSetupActions
        back={{ label: t("back"), onClick: () => navigate("/event/details") }}
        primary={{ label: t("next") }}
        error={error}
      />
    </form>
  );
}

export default function EventBrandingForm() {
  return <EventSetupBoundary component={BrandingForm} />;
}
