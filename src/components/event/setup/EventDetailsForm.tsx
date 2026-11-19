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
import EventWorkspacePageHeader from "../workspace/EventWorkspacePageHeader";
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

function focusChecklistTarget(form: HTMLFormElement | null) {
  if (!form || !globalThis.location.hash) return;
  const target = globalThis.document.getElementById(globalThis.location.hash.slice(1));
  if (!target || !form.contains(target)) return;
  target.focus({ preventScroll: true });
  target.scrollIntoView({ block: "center" });
}

function DetailsForm(props: EventSetupPageProps) {
  const { workspace, userId, locale } = props;
  const t = useTranslations("eventSetup"),
    d = useTranslations("eventHome.details");
  const brandingText = useTranslations("eventBranding");
  const dates = useTranslations("datePicker");
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
  const scheduleErrors: Record<string, string> = {
    SETUP_DATE_IN_PAST: dates("pastDate"),
    SETUP_DATE_ORDER: dates("invalidOrder"),
    SETUP_SURVEY_CLOSE_INVALID: t("closeError"),
  };
  const scheduleError = status === "error" && setup.errorCode
    ? scheduleErrors[setup.errorCode]
    : undefined;
  const feedback = setup.conflict
    ? t("draftConflict")
    : scheduleError ?? (status === "invalid"
      ? d(status)
      : media.mediaSaveError
        ? brandingText(media.mediaSaveError)
        : status === "error" || media.status === "error" || media.status === "invalid"
          ? t("saveError")
          : media.pendingMediaMessage ? t(media.pendingMediaMessage) : undefined);
  return (
    <>
      <form
        ref={focusChecklistTarget}
        className="es-setup-form event-details-page gap-4"
        inert={list.isOpen}
        aria-busy={pending}
        onSubmit={(e) => {
          e.preventDefault();
          void navigate("/event/publish");
        }}
      >
        <EventWorkspacePageHeader
          title={d("title")}
          description={d("description")}
          back={false}
        />
        <div className="event-details-sheet">
          <SetupMediaPanel
            workspace={workspace}
            draft={draft}
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
