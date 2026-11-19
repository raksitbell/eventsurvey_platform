"use client";

import PublicParticipantForm from "@/components/event/participant/forms/PublicParticipantForm";
import EventWorkspaceCard from "@/components/event/workspace/EventWorkspaceCard";
import Button from "@/components/ui/button/Button";
import { selectSetupForms } from "@/core/event/form-summary";
import useEventFormSummaries from "@/hooks/useEventFormSummaries";
import type {
  ParticipantEventData,
  ParticipantFormKind,
} from "@/types/event/participant";
import type { EventWorkspace } from "@/types/event/workspace";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface Props extends ParticipantEventData {
  workspace: EventWorkspace;
  contentLocale?: string | null;
}

export default function BrandingInterfacePreviews({
  workspace,
  draft,
  branding,
  bannerUrl,
  contentLocale,
}: Props) {
  const visual = useTranslations("eventBrandVisual");
  const participant = useTranslations("participantEvent");
  const formsText = useTranslations("eventForms");
  const [selected, setSelected] = useState<ParticipantFormKind | null>(null);
  const { forms, error, loading, retry } = useEventFormSummaries(
    workspace.eventId,
    workspace.canAccessForms && (draft.hasRegistration || draft.hasSurvey),
  );
  const available = selectSetupForms(forms);
  const kind =
    draft.hasRegistration && draft.hasSurvey
      ? (selected ??
        (available.survey && !available.registration
          ? "survey"
          : "registration"))
      : draft.hasSurvey
        ? "survey"
        : "registration";
  const form = available[kind];

  return (
    <div className="space-y-5 p-3">
      <section className="space-y-2">
        <h4 className="text-portal-label font-semibold">
          {visual("adminPreview")}
        </h4>
        <div inert className="event-admin-main overflow-hidden rounded-xl p-3">
          <div className="[zoom:0.8]">
            <EventWorkspaceCard
              workspace={{ ...workspace, ...draft }}
              banner={branding.banner}
            />
          </div>
        </div>
      </section>
      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-portal-label font-semibold">
            {visual("publicFormPreview")}
          </h4>
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
                  onClick={() => setSelected(type)}
                  className="rounded-lg border border-event-border px-2 py-1 text-sm aria-pressed:bg-event-action aria-pressed:text-white dark:border-gray-600"
                >
                  {participant(type)}
                </button>
              ))}
            </div>
          )}
        </div>
        {loading ? (
          <p role="status">{formsText("loading")}</p>
        ) : error ? (
          <div role="alert" className="flex items-center gap-3">
            {formsText("loadError")}
            <Button size="sm" onClick={retry}>
              {formsText("retry")}
            </Button>
          </div>
        ) : (
          <PublicParticipantForm
            key={form?.id ?? kind}
            readOnly
            kind={kind}
            result={form ? { status: "open", form } : { status: "unavailable" }}
            branding={branding}
            bannerUrl={bannerUrl}
            contentLocale={contentLocale}
          />
        )}
      </section>
    </div>
  );
}
