import type { EventBranding } from "@/types/event/branding";
import type { EventDraft } from "@/types/event/setup";

export type ParticipantDevice = "desktop" | "mobile";
export type ParticipantFormKind = "registration" | "survey";
export interface ParticipantEventData {
  draft: EventDraft;
  branding: EventBranding;
  bannerUrl: string | null;
}
