import type { UserRole } from "@/types/user";

export interface EventWorkspace {
  eventId: string;
  eventName: string;
  eventStatus: "draft" | "published" | "closed";
  userRole: UserRole;
  customRoleName: string | null;
}
