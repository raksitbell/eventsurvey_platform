import type { MockEventStatus } from "@/types/mock";
import type { UserRole } from "@/types/user";

export interface EventWorkspace {
  eventId: string;
  eventName: string;
  eventStatus: MockEventStatus;
  eventStartsAt?: string | null;
  eventEndsAt?: string | null;
  userRole: UserRole;
  customRoleName: string | null;
}
