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
>;

export type DraftSaveStatus = "saved" | "error" | "invalid";
