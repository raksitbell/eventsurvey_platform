"use client";

import BrandingAppearance from "@/components/event/setup/branding/BrandingAppearance";
import BrandingPreview from "@/components/event/setup/branding/BrandingPreview";
import EventSetupSteps from "@/components/event/setup/EventSetupSteps";
import EventSetupActions from "@/components/event/setup/EventSetupActions";
import EventSetupPendingMedia from "@/components/event/setup/EventSetupPendingMedia";
import EventSetupBoundary from "@/components/event/setup/EventSetupBoundary";
import type { EventSetupPageProps } from "@/components/event/setup/EventSetupBoundary";
import EventWorkspacePageHeader from "../workspace/EventWorkspacePageHeader";
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
    mediaSaveError,
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
    : mediaSaveError
      ? t(mediaSaveError)
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
      className="es-setup-form gap-7 bg-event-page dark:bg-gray-950"
    >
      <EventWorkspacePageHeader
        title={t("title")}
        description={t("description")}
        back={{ onClick: () => void navigate("/event"), disabled: pending }}
      />
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
