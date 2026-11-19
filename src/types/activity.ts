export const activityActions = ["edit", "add", "delete"] as const;

export type ActivityAction = (typeof activityActions)[number];
export type ActivityScope = "platform" | "event";
export type ActivityRelatedPage =
  "survey" | "registration" | "setup" | "access" | "team";
export type ActivityEntityType =
  | "postEventSurvey"
  | "surveyForm"
  | "registrationForm"
  | "eventDetails"
  | "teamMember"
  | "whitelist";
export type ActivityChangedField =
  | "questions"
  | "settings"
  | "title"
  | "description"
  | "startDate"
  | "endDate"
  | "location"
  | "access"
  | "role"
  | "permissions"
  | "capacity"
  | "status"
  | "responseDeadline"
  | "registrationCapacity";

export interface ActivityActor {
  id: string;
  name: string;
  nameTh?: string;
  role: "eventAdmin" | "platformAdmin";
}

export interface ActivityEvent {
  id: string;
  name: string;
  heroNameTh?: string;
  organizer?: string;
  posterUrl?: string;
}

interface ActivityValueChange {
  previous: string | number;
  current: string | number;
}

export interface ActivityRecord {
  id: string;
  eventId: string;
  actorUserId: string;
  actionType: ActivityAction;
  entityType: ActivityEntityType;
  relatedPage: ActivityRelatedPage;
  occurredAt: string;
  changedFields: readonly ActivityChangedField[];
  syntheticDiffs?: Partial<Record<ActivityChangedField, ActivityValueChange>>;
}

export interface ActivityData {
  events: readonly ActivityEvent[];
  actors: readonly ActivityActor[];
  records: readonly ActivityRecord[];
}

export interface ActivityFilters {
  search: string;
  eventId: string;
  action: ActivityAction | "";
  month: string;
  actorId: string;
}

export type ActivitySearchKey =
  | `actions.${ActivityAction}`
  | `entities.${ActivityEntityType}`
  | `pages.${ActivityRelatedPage}`
  | `fields.${ActivityChangedField}`
  | `roles.${ActivityActor["role"]}`;
