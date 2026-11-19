"use client";

import PublicParticipantForm from "@/components/event/participant/forms/PublicParticipantForm";
import ParticipantFormPreviewSkeleton from "@/components/event/participant/forms/ParticipantFormPreviewSkeleton";
import Button from "@/components/ui/button/Button";
import { selectSetupForms } from "@/core/event/form-summary";
import useEventFormSummaries from "@/hooks/useEventFormSummaries";
import type {
  ParticipantEventData,
  ParticipantFormKind,
} from "@/types/event/participant";
import type { EventWorkspace } from "@/types/event/workspace";
import {
  ClipboardDocumentListIcon,
  ComputerDesktopIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useId, useState, type KeyboardEvent, type ReactNode } from "react";

type PreviewTab = "display" | "form";
interface PreviewSelection {
  tab: PreviewTab;
  formKind: ParticipantFormKind | null;
}
export const initialPreviewSelection: PreviewSelection = {
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
  formState?: ReturnType<typeof useEventFormSummaries>;
  selectionState?: [PreviewSelection, (next: PreviewSelection) => void];
}

export default function BrandingPreviewGallery({
  children,
  className = "",
  viewportClassName = "",
  workspace,
  formState,
  selectionState,
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
  const ownFormState = useEventFormSummaries(
    workspace.eventId,
    !formState &&
      workspace.canAccessForms &&
      (draft.hasRegistration || draft.hasSurvey),
  );
  const { forms, error, loading, retry } = formState ?? ownFormState;
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
  function selectWithKeyboard(event: KeyboardEvent<HTMLButtonElement>) {
    let next: PreviewTab;
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

  const panelClass = `custom-scrollbar min-h-0 min-w-0 overflow-y-auto overscroll-contain rounded-xl ${viewportClassName}`;
  return (
    <div className={`flex min-h-0 min-w-0 flex-col ${className}`}>
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
            className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-2 text-sm font-medium text-gray-700 hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-event-action aria-selected:bg-event-action aria-selected:text-white dark:text-gray-200 dark:hover:bg-gray-700 dark:aria-selected:bg-event-action dark:aria-selected:text-white"
          >
            <Icon aria-hidden="true" className="size-5 shrink-0" />
            {visual(label)}
          </button>
        ))}
      </div>
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
          <div className="space-y-2 p-3">
            {draft.hasRegistration && draft.hasSurvey && (
              <div
                className="flex flex-wrap gap-1"
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
                    className="rounded-lg border border-event-border px-2 py-1 text-sm aria-pressed:bg-event-action aria-pressed:text-white dark:border-gray-600"
                  >
                    {participant(type)}
                  </button>
                ))}
              </div>
            )}
            {error ? (
              <div role="alert" className="flex items-center gap-3">
                {formsText("loadError")}
                <Button size="sm" onClick={retry}>
                  {formsText("retry")}
                </Button>
              </div>
            ) : loading ? (
              <ParticipantFormPreviewSkeleton label={formsText("loading")} />
            ) : (
              <PublicParticipantForm
                key={form?.id ?? kind}
                readOnly
                kind={kind}
                result={
                  form ? { status: "open", form } : { status: "unavailable" }
                }
                branding={branding}
                bannerUrl={bannerUrl}
                contentLocale={contentLocale}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
