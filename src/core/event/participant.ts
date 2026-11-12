import type { EventDraft } from "@/types/event/setup";
import type { ParticipantFormKind } from "@/types/event/participant";

export const PARTICIPANT_VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
} as const;

export function participantFormActions(
  draft: EventDraft,
): ParticipantFormKind[] {
  return (["registration", "survey"] as const).filter((kind) =>
    kind === "registration" ? draft.hasRegistration : draft.hasSurvey,
  );
}
