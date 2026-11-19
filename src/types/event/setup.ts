import type { EventWorkspace } from "@/types/event/workspace";
import type { LocalPublication, PublicationForm } from "@/core/event/publication";
import type { FormType } from "@/types/event/form";

export type EventDraft = Pick<
  EventWorkspace,
  | "content"
  | "eventName"
  | "description"
  | "locationName"
  | "locationDetail"
  | "startsAt"
  | "endsAt"
  | "isPrivate"
  | "hasRegistration"
  | "hasSurvey"
  | "surveyAccess"
  | "registrationCapacity"
  | "surveyCapacity"
> & {
  surveyCloseMode?: "event" | "week" | "fortnight" | "custom";
  surveyCustomClose?: string | null;
  alternateContent?: {
    eventName: string;
    description: string;
    locationName: string;
    locationDetail: string;
  };
};

export type DraftSaveStatus = "saved" | "error" | "invalid";

export type EventSetupMediaKind = "logo" | "banner" | "wordmark";

export interface EventSetupState {
  revision: number;
  draft: EventDraft | null;
  branding: Record<string, import("@/types/event/branding").EventBranding>;
  publishedBranding?: EventSetupState["branding"];
  pendingMedia: Record<string, EventSetupMediaKind[]>;
  publication: (Omit<LocalPublication, "forms"> & {
    forms: Record<FormType, Pick<PublicationForm, "id" | "closesAt"> | null>;
  }) | null;
  recoveredPublicationAt?: string;
}
