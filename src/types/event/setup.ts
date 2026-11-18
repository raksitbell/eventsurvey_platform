import type { EventWorkspace } from "@/types/event/workspace";

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
