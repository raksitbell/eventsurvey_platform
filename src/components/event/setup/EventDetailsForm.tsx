"use client";
import EventAccessSettings from "./details/EventAccessSettings";
import EventFormSchedule from "./details/EventFormSchedule";
import EventInformationFields from "./details/EventInformationFields";
import SetupMediaPanel from "./branding/SetupMediaPanel";
import EventSetupBoundary, {
  type EventSetupPageProps,
} from "./EventSetupBoundary";
import EventSetupActions from "./EventSetupActions";
import EventSetupPendingMedia from "@/components/event/setup/EventSetupPendingMedia";
import { WhitelistPage } from "@/components/event/whitelist/EventWhitelistPanel";
import { afterSaved, createSavedNavigation } from "@/core/event/draft";
import { eventWorkspaceDisplayStatus } from "@/core/event/workspace";
import useEventDraft from "@/hooks/useEventDraft";
import useEventBranding from "@/hooks/useEventBranding";
import { useModal } from "@/hooks/useModal";
import useSetupApiState from "@/hooks/useSetupApiState";
import useWhitelistNavigationGuard from "@/hooks/useWhitelistNavigationGuard";
import { useRouter } from "@/i18n/navigation";
import { showToast } from "@/utils/alert";
import { useTranslations } from "next-intl";

function DetailsForm(props: EventSetupPageProps) {
  const { workspace, userId, locale } = props;
  const t = useTranslations("eventSetup"),
    d = useTranslations("eventHome.details");
  const home = useTranslations("eventHome");
  const overview = useTranslations("eventOverview");
  const statusName = eventWorkspaceDisplayStatus(workspace);
  const statusLabel = workspace.setup?.publication || workspace.localPublishedAt
    ? t("published")
    : statusName === "draft"
      ? overview("draft")
      : home(`eventStatus.${statusName}`);
  const router = useRouter(),
    list = useModal();
  const setup = useSetupApiState(workspace);
  const { draft, status, readOnly, change, save, dirty } = useEventDraft(
    workspace,
    userId,
    locale,
    setup,
  );
  const media = useEventBranding(workspace, userId, locale, setup);
  const persist = async () => (await save()) && (await media.save());
  const navigate = createSavedNavigation(persist, router.push);
  const pending = setup.pending || media.saving;
  useWhitelistNavigationGuard(!list.isOpen && (dirty || media.dirty), persist);
  const feedback = setup.conflict
    ? t("draftConflict")
    : status === "invalid"
      ? d(status)
      : status === "error" || media.status === "error" || media.status === "invalid"
        ? t("saveError")
        : media.pendingMedia?.length
          ? t(media.pendingMedia.every((kind) => media.branding[kind]?.url.startsWith("data:"))
            ? "mediaLocalOnly"
            : "mediaAnotherBrowser")
          : undefined;
  return (
    <>
      <form
        className="event-details-page"
        inert={list.isOpen}
        aria-busy={pending}
        onSubmit={(e) => {
          e.preventDefault();
          void navigate("/event/publish");
        }}
      >
        <div className="event-details-sheet">
          <SetupMediaPanel
            branding={media.branding}
            bannerUrl={workspace.bannerUrl}
            readOnly={readOnly || pending}
            onChange={media.change}
          />
          <div className="event-setup-controls">
            <EventInformationFields
              statusLabel={statusLabel}
              draft={draft}
              uiLocale={locale}
              readOnly={readOnly || pending}
              onChange={change}
            />
            <EventAccessSettings
              workspace={workspace}
              draft={draft}
              readOnly={readOnly || pending}
              onChange={change}
              onOpenWhitelist={() => {
                void afterSaved(persist, list.openModal);
              }}
              onOpenBuilder={(kind) => {
                void navigate(`/event/setup/${kind}`);
              }}
            />
            <EventFormSchedule
              draft={draft}
              readOnly={readOnly || pending}
              onChange={change}
            />
          </div>
        </div>
        <EventSetupActions
          back={{
            label: t("backWorkspace"),
            onClick: () => void navigate("/event"),
            disabled: pending,
          }}
          primary={{ label: t("preview"), disabled: pending }}
          saveDraft={{
            label: t("save"),
            disabled: readOnly || pending,
            onClick: () => {
              void afterSaved(persist, () => showToast({ title: t("saved") }));
            },
          }}
          error={feedback}
        >
          {!readOnly && !!media.pendingMedia?.length && (
            <EventSetupPendingMedia
              kinds={media.pendingMedia}
              disabled={pending}
              onDiscard={media.discardPendingMedia}
            />
          )}
        </EventSetupActions>
      </form>
      {list.isOpen && (
        <WhitelistPage
          {...props}
          workspace={{ ...workspace, ...draft }}
          onClose={list.closeModal}
        />
      )}
    </>
  );
}
export default function EventDetailsForm() {
  return <EventSetupBoundary recoverDraft component={DetailsForm} />;
}
