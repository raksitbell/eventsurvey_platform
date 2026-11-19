import type { EventBranding } from "@/types/event/branding";
import type { EventDraft } from "@/types/event/setup";

export type ParticipantPreviewOrigin = "branding" | "publish";
export type ParticipantFormKind = "registration" | "survey";
export interface ParticipantPreviewSelection {
  tab: "display" | "form";
  formKind: ParticipantFormKind | null;
}
export interface ParticipantEventData {
  draft: EventDraft;
  branding: EventBranding;
  bannerUrl: string | null;
}
