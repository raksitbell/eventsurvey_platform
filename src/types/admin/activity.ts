import type { EventPermissionMatrix } from "@/types/event/permissions";

export type AuditActionKind = "create" | "update" | "delete" | "other";

export interface AdminUserEventMembership {
  id: string;
  name: string;
  roleName: string | null;
  isEventAdmin: boolean;
  permissions: EventPermissionMatrix | null;
}

export interface AdminActivityItem {
  id: string;
  occurredAt: string;
  actorUserId: string;
  actorName: string;
  actorRole: string | null;
  eventId: string | null;
  eventName: string | null;
  action: string;
  actionKind: AuditActionKind;
  resourceType: string;
  resourceId: string | null;
  /** Stable module key for i18n (`modules.*`). */
  module: string;
  /** Localized description for the request locale. */
  description: string;
  metadata: Record<string, unknown> | null;
  includesUnmaskedPii: boolean;
}

export interface AdminActivityStats {
  total: number;
  users: number;
  events: number;
  platform: number;
}

export interface AdminActivityFilters {
  eventId?: string | null;
  accountType?: "all" | "platform" | "event";
  /** Inclusive start of day (ISO). */
  startDate?: string | null;
  /** Inclusive end of day (ISO). */
  endDate?: string | null;
  actorUserId?: string | null;
}

export interface AdminActivityResponse {
  items: AdminActivityItem[];
  stats: AdminActivityStats;
  events: { id: string; name: string }[];
}

export interface AdminUserActivityProfile {
  user: {
    id: string;
    name: string;
    email: string;
    roleLabel: string | null;
  };
  /** Events this user belongs to (with permission matrix for accordion). */
  memberships: AdminUserEventMembership[];
  /** Distinct events appearing in the (filtered) timeline — filter options. */
  events: { id: string; name: string }[];
  items: AdminActivityItem[];
}
