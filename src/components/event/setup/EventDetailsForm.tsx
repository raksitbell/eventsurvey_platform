"use client";
import EventAccessSettings from "./details/EventAccessSettings";
import EventFormSchedule from "./details/EventFormSchedule";
import EventInformationFields from "./details/EventInformationFields";
import SetupMediaPanel from "./branding/SetupMediaPanel";
import EventSetupBoundary, {
  type EventSetupPageProps,
} from "./EventSetupBoundary";
import EventSetupActions from "./EventSetupActions";
import { WhitelistPage } from "@/components/event/whitelist/EventWhitelistPanel";
import { createSavedNavigation } from "@/core/event/draft";
import { eventWorkspaceDisplayStatus } from "@/core/event/workspace";
import useEventDraft from "@/hooks/useEventDraft";
import useEventBranding from "@/hooks/useEventBranding";
import { useModal } from "@/hooks/useModal";
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
  const statusLabel = workspace.localPublishedAt
    ? t("published")
    : statusName === "draft"
      ? overview("draft")
      : home(`eventStatus.${statusName}`);
  const router = useRouter(),
    list = useModal();
  const { draft, status, readOnly, change, save } = useEventDraft(
    workspace,
    userId,
    locale,
  );
  const media = useEventBranding(workspace, userId, locale);
  const persist = () => save() && media.save();
  const navigate = createSavedNavigation(persist, router.push);
  return (
    <>
      <form
        className="event-details-page"
        inert={list.isOpen}
        onSubmit={(e) => {
          e.preventDefault();
          navigate("/event/publish");
        }}
      >
        <div className="event-details-sheet">
          <SetupMediaPanel
            branding={media.branding}
            bannerUrl={workspace.bannerUrl}
            readOnly={readOnly}
            onChange={media.change}
          />
          <div className="event-setup-controls">
            <EventInformationFields
              statusLabel={statusLabel}
              draft={draft}
              uiLocale={locale}
              readOnly={readOnly}
              onChange={change}
            />
            <EventAccessSettings
              workspace={workspace}
              draft={draft}
              readOnly={readOnly}
              onChange={change}
              onOpenWhitelist={() => {
                if (persist()) list.openModal();
              }}
              onOpenBuilder={(kind) => navigate(`/event/setup/${kind}`)}
            />
            <EventFormSchedule
              draft={draft}
              readOnly={readOnly}
              onChange={change}
            />
          </div>
        </div>
        <EventSetupActions
          back={{
            label: t("backWorkspace"),
            onClick: () => navigate("/event"),
          }}
          primary={{ label: t("preview") }}
          saveDraft={{
            label: t("save"),
            disabled: readOnly,
            onClick: () => {
              if (persist()) showToast({ title: t("saved") });
            },
          }}
          error={
            status === "error" || status === "invalid"
              ? d(status)
              : media.status === "error" || media.status === "invalid"
                ? t("saveError")
                : undefined
          }
        />
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
  return <EventSetupBoundary component={DetailsForm} />;
}
