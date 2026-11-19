"use client";

import BrandingAppearance from "@/components/event/setup/branding/BrandingAppearance";
import BrandingPreview from "@/components/event/setup/branding/BrandingPreview";
import EventSetupSteps from "@/components/event/setup/EventSetupSteps";
import EventSetupActions from "@/components/event/setup/EventSetupActions";
import EventSetupPendingMedia from "@/components/event/setup/EventSetupPendingMedia";
import EventSetupBoundary from "@/components/event/setup/EventSetupBoundary";
import type { EventSetupPageProps } from "@/components/event/setup/EventSetupBoundary";
import { createSavedNavigation } from "@/core/event/draft";
import useEventBranding from "@/hooks/useEventBranding";
import useEventDraft from "@/hooks/useEventDraft";
import useSetupApiState from "@/hooks/useSetupApiState";
import useWhitelistNavigationGuard from "@/hooks/useWhitelistNavigationGuard";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

function BrandingForm({ workspace, userId, locale }: EventSetupPageProps) {
  const t = useTranslations("eventBranding");
  const setupText = useTranslations("eventSetup");
  const router = useRouter();
  const setup = useSetupApiState(workspace);
  const {
    draft,
    save: saveDetails,
    status: detailsStatus,
    dirty: detailsDirty,
  } = useEventDraft(workspace, userId, locale, setup);
  const {
    branding,
    status,
    readOnly,
    change,
    save,
    saving,
    pendingMedia,
    pendingMediaMessage,
    discardPendingMedia,
    dirty,
  } = useEventBranding(workspace, userId, locale, setup);
  const saveAll = async () => (await saveDetails()) && (await save());
  const navigate = createSavedNavigation(saveAll, router.push);
  const pending = setup.pending || saving;
  useWhitelistNavigationGuard(detailsDirty || dirty, saveAll);
  const error = setup.conflict
    ? setupText("draftConflict")
    : detailsStatus === "error" || detailsStatus === "invalid" ||
        status === "error" || status === "invalid"
      ? setupText("saveError")
      : pendingMediaMessage ? setupText(pendingMediaMessage) : undefined;
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void navigate("/event/forms");
      }}
      aria-busy={pending}
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
      <EventSetupSteps current={2} onNavigate={() => !pending && saveAll()} />
      <div className="grid rounded-2xl bg-white lg:grid-cols-3 dark:bg-gray-900">
        <BrandingAppearance
          branding={branding}
          readOnly={readOnly || pending}
          onChange={change}
        />
        <div className="min-w-0 lg:col-span-2">
          <BrandingPreview
            branding={branding}
            draft={draft}
            bannerUrl={workspace.bannerUrl}
            onOpen={() => !pending && saveAll()}
          />
        </div>
      </div>
      <EventSetupActions
        back={{
          label: t("back"),
          onClick: () => void navigate("/event/details"),
          disabled: pending,
        }}
        primary={{ label: t("next"), disabled: pending }}
        error={error}
      >
        {!readOnly && !!pendingMedia?.length && (
          <EventSetupPendingMedia
            kinds={pendingMedia}
            disabled={pending}
            onDiscard={discardPendingMedia}
          />
        )}
      </EventSetupActions>
    </form>
  );
}

export default function EventBrandingForm() {
  return <EventSetupBoundary recoverDraft component={BrandingForm} />;
}
