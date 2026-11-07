import type { MockAccountStatus, MockEventStatus } from "@/types/mock";

export type AdminEventListItem = {
  id: string;
  title: string;
  slug: string;
  status: MockEventStatus;
  adminName: string | null;
  adminEmail: string | null;
  adminUserId: string | null;
  startsAt: string | null;
  endsAt: string | null;
  updatedAt: string;
  /** scheduled → open is allowed when start time has arrived (or unset) */
  canStart: boolean;
};

export type EventCloseWarning = {
  formId: string;
  formType: "registration" | "survey";
  /** post-event survey and/or form window still open */
  reasons: Array<"post_event" | "not_expired" | "still_open">;
  closesAt: string | null;
};

export type AdminEventsResponse = {
  events: AdminEventListItem[];
};

export type AdminEventTranslationView = {
  locale: string;
  title: string;
  description: string | null;
  locationName: string | null;
  addressText: string | null;
};

export type AdminEventMember = {
  id: string;
  name: string;
  email: string;
  status: MockAccountStatus;
  roleName: string | null;
};

export type AdminEventDetail = AdminEventListItem & {
  bannerUrls: string[];
  defaultLocale: string;
  isPrivate: boolean;
  hasRegistration: boolean;
  hasSurvey: boolean;
  surveyAccess: "public" | "registered_only" | null;
  opensAt: string | null;
  closesAt: string | null;
  createdAt: string;
  translations: AdminEventTranslationView[];
  users: AdminEventMember[];
};

export type AssignableAdmin = {
  id: string;
  name: string;
  email: string;
};

export type CreateAdminEventMode = "existing" | "new";

export type CreateAdminEventInput = {
  titleTh: string;
  titleEn: string;
  slug: string;
  mode: CreateAdminEventMode;
  /** Required when mode === "existing" */
  existingUserId?: string;
  /** Required when mode === "new" */
  adminName?: string;
  adminEmail?: string;
};

export type CreateAdminEventResult = {
  event: AdminEventListItem;
  /** Present when an existing active admin was assigned — UI may impersonate */
  impersonateUserId: string | null;
  inviteSent: boolean;
};

/** Platform may edit titles/slug while the event is still draft */
export type UpdateAdminEventInput = {
  titleTh: string;
  titleEn: string;
  slug: string;
};

/** Platform admin status actions — no approve step */
export type AdminEventStatusAction = "start" | "close";
