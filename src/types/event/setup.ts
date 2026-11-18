import type { EventWorkspace } from "@/types/event/workspace";

export type EventDraft = Pick<
  EventWorkspace,
  | "eventName"
  | "description"
  | "locationName"
  | "startsAt"
  | "endsAt"
  | "isPrivate"
  | "hasRegistration"
  | "hasSurvey"
  | "surveyAccess"
  | "registrationCapacity"
  | "surveyCapacity"
> & {
  locationDetail?: string;
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
