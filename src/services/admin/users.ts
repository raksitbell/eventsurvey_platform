import { mockApi } from "@/core/api/mock-client";
import { resolveEventTitle } from "@/core/mock/event-title";
import {
  isActiveMockUser,
  mapMockUserToUser,
} from "@/core/mock/map-user";
import { getRolePermissions } from "@/core/mock/role-permissions";
import { routing, type Locale } from "@/i18n/routing";
import type {
  AdminUserListItem,
  AdminUsersResponse,
} from "@/types/admin/users";
import type {
  MockEvent,
  MockEventTranslation,
  MockPermissionCode,
  MockRole,
  MockRolePermission,
  MockUser,
} from "@/types/mock";
import type { User, UserRole } from "@/types/user";

const PORTAL_ROLES: UserRole[] = ["super_admin", "event_owner", "sub_user"];

function stripPassword(user: User): Omit<User, "password"> {
  const safeUser = { ...user };
  delete safeUser.password;
  return safeUser;
}

function permissionsByRoleId(
  rows: MockRolePermission[],
): Map<string, MockPermissionCode[]> {
  const map = new Map<string, MockPermissionCode[]>();
  for (const row of rows) {
    const list = map.get(row.role_id) ?? [];
    list.push(row.permission);
    map.set(row.role_id, list);
  }
  return map;
}

/** Bind users + events + event_translations + roles for the admin users table */
export async function getBoundAdminUsers(
  role?: string,
  locale: Locale = routing.defaultLocale,
): Promise<AdminUsersResponse> {
  const [mockUsers, events, translations, roles, rolePermissions] =
    await Promise.all([
      mockApi.get<MockUser[]>("/users?_sort=created_at&_order=asc"),
      mockApi.get<MockEvent[]>("/events"),
      mockApi.get<MockEventTranslation[]>("/event_translations"),
      mockApi.get<MockRole[]>("/roles"),
      mockApi.get<MockRolePermission[]>("/role_permissions"),
    ]);

  const liveEvents = new Set(
    events.filter((event) => !event.deleted_at).map((event) => event.id),
  );
  const rolesById = new Map(roles.map((item) => [item.id, item]));
  const permsByRole = permissionsByRoleId(rolePermissions);

  const usersById = new Map(
    mockUsers
      .map((mock) =>
        mapMockUserToUser(
          mock,
          mock.role_id ? (permsByRole.get(mock.role_id) ?? []) : [],
        ),
      )
      .filter((user): user is User => Boolean(user))
      .map((user) => [user.id, user]),
  );

  let portalUsers = mockUsers
    .filter(isActiveMockUser)
    .map((mock) =>
      mapMockUserToUser(
        mock,
        mock.role_id ? (permsByRole.get(mock.role_id) ?? []) : [],
      ),
    )
    .filter(
      (user): user is User =>
        user !== null && PORTAL_ROLES.includes(user.role),
    );

  if (role && role !== "all" && PORTAL_ROLES.includes(role as UserRole)) {
    portalUsers = portalUsers.filter((user) => user.role === role);
  }

  const bound: AdminUserListItem[] = portalUsers.map((user) => {
    const safe = stripPassword(user);
    const owner = user.ownerId ? usersById.get(user.ownerId) : null;
    const mock = mockUsers.find((row) => row.id === user.id);
    const eventId = mock?.event_id;
    const eventName =
      eventId && liveEvents.has(eventId)
        ? resolveEventTitle(translations, eventId, locale)
        : null;

    /** Custom role name from `/roles` via `users.role_id` (sub_user / optional admin) */
    const customRoleName =
      mock?.role_id && user.role === "sub_user"
        ? (rolesById.get(mock.role_id)?.name ?? null)
        : null;

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
  const mockUser = await mockApi.get<MockUser>(`/users/${userId}`);
  if (!mockUser || !isActiveMockUser(mockUser)) return null;
  const permissions = await getRolePermissions(mockUser.role_id);
  const user = mapMockUserToUser(mockUser, permissions);
  if (!user) return null;
  return stripPassword(user) as User;
}
