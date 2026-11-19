import type { MockEventStatus } from "@/types/mock";
import type { UserRole } from "@/types/user";
import type { EventSetupState } from "@/types/event/setup";
import type { EventContent } from "@/types/event/content";

export interface EventWorkspace {
  eventId: string;
  setup?: EventSetupState;
  /** A validated browser-only setup draft is applied; never sent to BFF. */
  hasLocalDraft?: boolean;
  /** Browser-only publication receipt; never sent to BFF. */
  localPublishedAt?: string;
  eventName: string;
  content?: EventContent;
  eventStatus: MockEventStatus;
  userRole: UserRole;
  customRoleName: string | null;
  canAccessDashboard: boolean;
  /** At least one form module is view_only or can_edit (restricted hides Form nav). */
  canAccessForms: boolean;
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
  locationDetail?: string;
  registrationCapacity?: number | null;
  surveyCapacity?: number | null;
  canEditEvent: boolean;
  canManageWhitelist?: boolean;
  whitelistEnabledForSetup?: boolean;
  canManageSurveyForm?: boolean;
  surveyAccess: "public" | "registered_only" | null;
}
