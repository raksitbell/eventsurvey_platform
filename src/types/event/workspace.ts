import type { MockEventStatus } from "@/types/mock";
import type { UserRole } from "@/types/user";

export interface EventWorkspace {
  eventId: string;
  /** A validated browser-only setup draft is applied; never sent to BFF. */
  hasLocalDraft?: boolean;
  /** Browser-only publication receipt; never sent to BFF. */
  localPublishedAt?: string;
  eventName: string;
  eventStatus: MockEventStatus;
  userRole: UserRole;
  customRoleName: string | null;
  description: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isPrivate: boolean;
  hasRegistration: boolean;
  hasSurvey: boolean;
  bannerUrl: string | null;
  subUserCount: number;
  subUsers: { id: string; name: string }[];
  locationName: string | null;
  registrationCapacity?: number | null;
  surveyCapacity?: number | null;
  canEditEvent: boolean;
  canManageWhitelist?: boolean;
  surveyAccess: "public" | "registered_only" | null;
}
