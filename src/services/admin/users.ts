import { mockApi } from "@/core/api/mock-client";
import { localizeText } from "@/core/i18n/localized-text";
import { routing, type Locale } from "@/i18n/routing";
import type {
  AdminUserListItem,
  AdminUsersResponse,
} from "@/types/admin/users";
import type { MockEvent, MockEventUser, MockRole } from "@/types/mock";
import type { User, UserRole } from "@/types/user";

const PORTAL_ROLES: UserRole[] = ["super_admin", "event_owner", "sub_user"];

function stripPassword(user: User): Omit<User, "password"> {
  const safeUser = { ...user };
  delete safeUser.password;
  return safeUser;
}

/** Bind users + events + event_users + roles for the admin users table */
export async function getBoundAdminUsers(
  role?: string,
  locale: Locale = routing.defaultLocale,
): Promise<AdminUsersResponse> {
  const [users, events, eventUsers, roles] = await Promise.all([
    mockApi.get<User[]>("/users?isDeleted=false&_sort=createdAt&_order=asc"),
    mockApi.get<MockEvent[]>("/events?isDeleted=false"),
    mockApi.get<MockEventUser[]>("/event_users?isDeleted=false&status=active"),
    mockApi.get<MockRole[]>("/roles?isDeleted=false"),
  ]);

  const usersById = new Map(users.map((user) => [user.id, user]));
  const rolesById = new Map(roles.map((item) => [item.id, item]));
  const eventsById = new Map(events.map((event) => [event.id, event]));

  /** 1 event_owner ↔ 1 event */
  const eventByOwnerId = new Map<string, MockEvent>();
  for (const event of events) {
    eventByOwnerId.set(event.ownerId, event);
  }

  /** 1 sub_user ↔ 1 event assignment */
  const assignmentByUserId = new Map<string, MockEventUser>();
  for (const assignment of eventUsers) {
    assignmentByUserId.set(assignment.userId, assignment);
  }

  let portalUsers = users.filter((user) => PORTAL_ROLES.includes(user.role));

  if (role && role !== "all" && PORTAL_ROLES.includes(role as UserRole)) {
    portalUsers = portalUsers.filter((user) => user.role === role);
  }

  const bound: AdminUserListItem[] = portalUsers.map((user) => {
    const safe = stripPassword(user);
    const owner = user.ownerId ? usersById.get(user.ownerId) : null;

    let eventName: string | null = null;
    let customRoleName: string | null = null;

    if (user.role === "event_owner") {
      const event = eventByOwnerId.get(user.id);
      eventName = event ? localizeText(event.name, locale) : null;
    } else if (user.role === "sub_user") {
      const assignment = assignmentByUserId.get(user.id);
      if (assignment) {
        const event = eventsById.get(assignment.eventId);
        eventName = event ? localizeText(event.name, locale) : null;
        customRoleName = rolesById.get(assignment.roleId)?.name ?? null;
      }
    }

    return {
      id: safe.id,
      name: safe.name,
      email: safe.email,
      phone: safe.phone,
      role: safe.role,
      status: safe.status,
      ownerId: safe.ownerId,
      ownerName: owner?.name ?? null,
      canViewSensitiveData: safe.canViewSensitiveData,
      eventName,
      customRoleName,
      createdAt: safe.createdAt,
      updatedAt: safe.updatedAt,
    };
  });

  const byRole: Record<string, number> = {};
  for (const user of bound) {
    byRole[user.role] = (byRole[user.role] ?? 0) + 1;
  }

  return {
    users: bound,
    meta: {
      total: bound.length,
      byRole,
    },
  };
}

export async function getUserForImpersonation(
  userId: string,
): Promise<User | null> {
  const user = await mockApi.get<User>(`/users/${userId}`);
  if (!user || user.isDeleted || user.status !== "active") return null;
  return stripPassword(user) as User;
}
