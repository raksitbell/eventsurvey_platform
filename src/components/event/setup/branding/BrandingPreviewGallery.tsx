"use client";

import PublicParticipantForm from "@/components/event/participant/forms/PublicParticipantForm";
import ParticipantFormPreviewSkeleton from "@/components/event/participant/forms/ParticipantFormPreviewSkeleton";
import Button from "@/components/ui/button/Button";
import { projectEventContent } from "@/core/event/content";
import { selectSetupForms } from "@/core/event/form-summary";
import useEventFormSummaries from "@/hooks/useEventFormSummaries";
import type {
  ParticipantEventData,
  ParticipantPreviewSelection,
} from "@/types/event/participant";
import type { EventWorkspace } from "@/types/event/workspace";
import {
  ClipboardDocumentListIcon,
  ComputerDesktopIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useId, useState, type KeyboardEvent, type ReactNode } from "react";

const initialPreviewSelection: ParticipantPreviewSelection = {
  tab: "display",
  formKind: null,
};
const tabs = [
  { id: "display", label: "displayNav", Icon: ComputerDesktopIcon },
  { id: "form", label: "formNav", Icon: ClipboardDocumentListIcon },
] as const;

interface Props extends ParticipantEventData {
  workspace: EventWorkspace;
  children: ReactNode;
  className?: string;
  viewportClassName?: string;
  contentLocale?: string | null;
  selectionState?: [
    ParticipantPreviewSelection,
    (next: ParticipantPreviewSelection) => void,
  ];
  fullPreview?: {
    label: string;
    disabled?: boolean;
    onOpen: (selection: ParticipantPreviewSelection) => void;
  };
  pageHeader?: (tabs: ReactNode) => ReactNode;
}

export default function BrandingPreviewGallery({
  children,
  className = "",
  viewportClassName = "",
  workspace,
  selectionState,
  fullPreview,
  pageHeader,
  draft,
  branding,
  bannerUrl,
  contentLocale,
}: Props) {
  const galleryId = useId();
  const previewText = useTranslations("eventBranding");
  const visual = useTranslations("eventBrandVisual");
  const participant = useTranslations("participantEvent");
  const formsText = useTranslations("eventForms");
  const localSelection = useState(initialPreviewSelection);
  const [selection, setSelection] = selectionState ?? localSelection;
  const { tab, formKind } = selection;
  const { forms, error, loading, retry } = useEventFormSummaries(
    workspace.eventId,
    tab === "form" &&
      workspace.canAccessForms &&
      (draft.hasRegistration || draft.hasSurvey),
  );
  const available = selectSetupForms(forms);
  const kind =
    draft.hasRegistration && draft.hasSurvey
      ? (formKind ??
        (available.survey && !available.registration
          ? "survey"
          : "registration"))
      : draft.hasSurvey
        ? "survey"
        : "registration";
  const publication = workspace.setup?.publication;
  const frozen = publication?.forms[kind];
  const form = publication
    ? forms.find((item) => item.type === kind && item.id === frozen?.id)
    : available[kind];
  const formEnabled = kind === "registration" ? draft.hasRegistration : draft.hasSurvey;
  const canViewForm = workspace.canAccessForms && workspace.viewableFormTypes.includes(kind);
  const emptyStatus = !formEnabled ? "previewDisabled" : canViewForm ? "previewEmpty" : "previewRestricted";
  function selectWithKeyboard(event: KeyboardEvent<HTMLButtonElement>) {
    let next: ParticipantPreviewSelection["tab"];
    switch (event.key) {
      case "ArrowLeft":
      case "ArrowRight":
        next = tab === "display" ? "form" : "display";
        break;
      case "Home":
        next = "display";
        break;
      case "End":
        next = "form";
        break;
      default:
        return;
    }
    event.preventDefault();
    setSelection({ ...selection, tab: next });
    event.currentTarget.ownerDocument
      .getElementById(`${galleryId}-tab-${next}`)
      ?.focus({ preventScroll: true });
  }

  const panelClass = `custom-scrollbar min-h-0 min-w-0 overflow-y-auto ${pageHeader ? "flex-1 overscroll-contain" : "rounded-xl"} ${viewportClassName}`;
  const tabList = (
    <div
      role="tablist"
      aria-label={previewText("preview")}
      className="grid shrink-0 grid-cols-2 gap-1 rounded-xl bg-event-tile p-1 dark:bg-gray-800"
    >
      {tabs.map(({ id, label, Icon }) => (
        <button
          key={id}
          id={`${galleryId}-tab-${id}`}
          type="button"
          role="tab"
          aria-selected={tab === id}
          aria-controls={`${galleryId}-panel-${id}`}
          tabIndex={tab === id ? 0 : -1}
          onClick={() => setSelection({ ...selection, tab: id })}
          onKeyDown={selectWithKeyboard}
          className="flex min-h-11 min-w-0 cursor-pointer items-center justify-center gap-2 rounded-lg px-2 text-sm font-medium wrap-anywhere text-gray-700 hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-event-action aria-selected:bg-event-action aria-selected:text-white dark:text-gray-200 dark:hover:bg-gray-700 dark:aria-selected:bg-event-action dark:aria-selected:text-white"
        >
          <Icon aria-hidden="true" className="size-5 shrink-0" />
          {visual(label)}
        </button>
      ))}
    </div>
  );
  return (
    <div className={`@container/preview flex min-h-0 min-w-0 flex-col ${className}`}>
      {pageHeader ? pageHeader(tabList) : tabList}
      <div
        role="tabpanel"
        id={`${galleryId}-panel-display`}
        aria-labelledby={`${galleryId}-tab-display`}
        hidden={tab !== "display"}
        tabIndex={0}
        className={panelClass}
      >
        {tab === "display" && children}
      </div>
      <div
        role="tabpanel"
        id={`${galleryId}-panel-form`}
        aria-labelledby={`${galleryId}-tab-form`}
        hidden={tab !== "form"}
        tabIndex={0}
        className={panelClass}
      >
        {tab === "form" && (
          <div
            className={`@container/form-preview ${pageHeader ? "flex min-h-full flex-col" : "space-y-2 py-2 @sm/preview:px-3"}`}
          >
            {draft.hasRegistration && draft.hasSurvey && (
              <div
                className={`grid grid-cols-2 gap-1 @md/form-preview:flex @md/form-preview:flex-wrap ${pageHeader ? "shrink-0 justify-center border-b border-preview-border bg-white p-2 dark:border-gray-700 dark:bg-gray-900" : ""}`}
                role="group"
                aria-label={visual("publicFormPreview")}
              >
                {(["registration", "survey"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={type === kind}
                    onClick={() =>
                      setSelection({ ...selection, formKind: type })
                    }
                    className="min-h-11 min-w-0 rounded-lg border border-event-border px-2 py-1 text-sm leading-tight font-medium wrap-anywhere text-gray-700 focus-visible:outline-2 focus-visible:outline-event-action aria-pressed:bg-event-action aria-pressed:text-white @md/form-preview:px-3 dark:border-gray-600 dark:text-gray-200 dark:aria-pressed:text-white"
                  >
                    {participant(type)}
                  </button>
                ))}
              </div>
            )}
            {error ? (
              <div
                role="alert"
                className={`flex items-center gap-3 ${pageHeader ? "p-4" : ""}`}
              >
                {formsText("loadError")}
                <Button size="sm" onClick={retry}>
                  {formsText("retry")}
                </Button>
              </div>
            ) : loading ? (
              <ParticipantFormPreviewSkeleton
                label={formsText("loading")}
                bannerLayout={branding.banner?.url || bannerUrl ? branding.layout ?? "portrait" : undefined}
              />
            ) : (
              <PublicParticipantForm
                key={form?.id ?? kind}
                readOnly
                fillViewport={Boolean(pageHeader)}
                kind={kind}
                eventDetails={projectEventContent(draft, contentLocale ?? undefined)}
                result={
                  form && formEnabled && canViewForm ? { status: "open", form } : { status: emptyStatus }
                }
                branding={branding}
                bannerUrl={bannerUrl}
                contentLocale={contentLocale}
              />
            )}
          </div>
        )}
      </div>
      {fullPreview && (
        <Button
          type="button"
          variant="outline"
          className="mt-3 min-h-11 self-center"
          startIcon={<EyeIcon className="size-4" aria-hidden="true" />}
          disabled={fullPreview.disabled}
          onClick={() =>
            fullPreview.onOpen({
              tab,
              formKind: tab === "form" ? kind : formKind,
            })
          }
        >
          {fullPreview.label}
        </Button>
      )}
    </div>
  );
}
