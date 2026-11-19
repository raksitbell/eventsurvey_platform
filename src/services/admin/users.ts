import { mockApi } from "@/core/api/mock-client";
import { ServiceError } from "@/core/api/service-error";
import { writeAuditLog } from "@/core/audit/write";
import {
  maskName,
  mayViewPii,
  projectUserPii,
  type PiiViewer,
} from "@/core/auth/pii";
import {
  getPlatformAccessForUser,
  getPlatformAccessRow,
} from "@/core/mock/access";
import { resolveEventTitle } from "@/core/mock/event-title";
import {
  isActiveMockUser,
  mapMockUserToUser,
} from "@/core/mock/map-user";
import { getRolePermissions } from "@/core/mock/role-permissions";
import { getActivePortalAccount } from "@/services/auth/session";
import { routing, type Locale } from "@/i18n/routing";
import type {
  AdminUserListItem,
  AdminUsersResponse,
  PlatformAccessFlags,
} from "@/types/admin/users";
import type {
  MockEvent,
  MockEventAccess,
  MockEventTranslation,
  MockPlatformAccess,
  MockUser,
} from "@/types/mock";
import type { User, UserRole } from "@/types/user";
import { randomUUID } from "node:crypto";

interface RoleRow {
  id: string;
  name?: string;
}

interface RolePermRow {
  role_id: string;
  permission: string;
}

const PORTAL_ROLES: UserRole[] = ["super_admin", "event_owner", "sub_user"];

/** Bind users + events + event_translations + event_access for the admin users table */
export async function getBoundAdminUsers(
  role?: string,
  locale: Locale = routing.defaultLocale,
  viewer?: PiiViewer,
): Promise<AdminUsersResponse> {
  const [mockUsers, events, translations, eventAccess, platformAccess] =
    await Promise.all([
      mockApi.get<MockUser[]>("/users?_sort=created_at&_order=asc"),
      mockApi.get<MockEvent[]>("/events"),
      mockApi.get<MockEventTranslation[]>("/event_translations"),
      mockApi.get<MockEventAccess[]>("/event_access"),
      mockApi.get<MockPlatformAccess[]>("/platform_access").catch(() => []),
    ]);

  const platformByUser = new Map(
    platformAccess
      .filter((row) => !row.deleted_at)
      .map((row) => [row.user_id, row]),
  );

  const liveEvents = new Set(events.map((event) => event.id));
  const accessByUser = new Map(
    eventAccess
      .filter((row) => !row.deleted_at)
      .map((row) => [row.user_id, row]),
  );

  const permissionsByUserId = new Map<string, Awaited<ReturnType<typeof getRolePermissions>>>();
  await Promise.all(
    mockUsers.map(async (mock) => {
      if (mock.system_role !== "event_user") {
        permissionsByUserId.set(mock.id, []);
        return;
      }
      permissionsByUserId.set(
        mock.id,
        await getRolePermissions(mock.id, mock.event_id),
      );
    }),
  );

  const usersById = new Map(
    mockUsers
      .map((mock) =>
        mapMockUserToUser(mock, permissionsByUserId.get(mock.id) ?? []),
      )
      .filter((user): user is User => Boolean(user))
      .map((user) => [user.id, user]),
  );

  let portalUsers = mockUsers
    .filter(isActiveMockUser)
    .map((mock) =>
      mapMockUserToUser(mock, permissionsByUserId.get(mock.id) ?? []),
    )
    .filter(
      (user): user is User =>
        user !== null && PORTAL_ROLES.includes(user.role),
    );

  if (role && role !== "all" && PORTAL_ROLES.includes(role as UserRole)) {
    portalUsers = portalUsers.filter((user) => user.role === role);
  }

  const bound: AdminUserListItem[] = portalUsers.map((user) => {
    const safe = projectUserPii(user, mayViewPii(viewer, user.id));
    const owner = user.ownerId ? usersById.get(user.ownerId) : null;
    const mock = mockUsers.find((row) => row.id === user.id);
    const eventId = mock?.event_id;
    const eventName =
      eventId && liveEvents.has(eventId)
        ? resolveEventTitle(translations, eventId, locale)
        : null;

    const customRoleName =
      user.role === "sub_user"
        ? (accessByUser.get(user.id)?.role_name ?? null)
        : null;

    const platformRow = platformByUser.get(user.id);
    const rawMatrix = platformRow?.matrix as
      | (MockPlatformAccess["matrix"] & { activity?: string })
      | undefined;
    const legacyActivity =
      rawMatrix?.activity === "view_only" || rawMatrix?.activity === "can_edit";

    return {
      id: safe.id,
      name: safe.name,
      email: safe.email,
      phone: safe.phone,
      role: safe.role,
      status: safe.status,
      ownerId: safe.ownerId,
      ownerName: owner
        ? mayViewPii(viewer, owner.id)
          ? owner.name
          : maskName(owner.name)
        : null,
      canViewSensitiveData: safe.canViewSensitiveData,
      eventId: eventId && liveEvents.has(eventId) ? eventId : null,
      eventName,
      customRoleName,
      lastActiveAt: mock?.updated_at ?? mock?.joined_at ?? safe.updatedAt,
      ...(user.role === "super_admin"
        ? {
            canViewActivity:
              rawMatrix?.canViewActivity === true || legacyActivity,
            canInspection: rawMatrix?.canInspection === true,
          }
        : {}),
      createdAt: safe.createdAt,
      updatedAt: safe.updatedAt,
    };
  });

  const byRole: Record<string, number> = {};
  for (const user of bound) {
    byRole[user.role] = (byRole[user.role] ?? 0) + 1;
  }

  const eventList = events
    .filter((e) => !e.deleted_at)
    .map((e) => ({
      id: e.id,
      title: resolveEventTitle(translations, e.id, locale) || "",
    }));

  return {
    users: bound,
    events: eventList,
    meta: {
      total: bound.length,
      byRole,
    },
  };
}

export async function getUserForImpersonation(
  userId: string,
): Promise<User | null> {
  const account = await getActivePortalAccount(userId);
  return account?.user ?? null;
}

/** Update boolean platform flags for a super_admin (creates platform_access if missing). */
export async function updatePlatformAccessFlags(
  targetUserId: string,
  flags: PlatformAccessFlags,
  actorUserId: string,
): Promise<PlatformAccessFlags> {
  const account = await getActivePortalAccount(targetUserId);
  if (!account || account.user.role !== "super_admin") {
    throw new ServiceError("INVALID_TARGET", 400, "Not a platform admin");
  }

  const current = await getPlatformAccessForUser(targetUserId);
  const nextMatrix = {
    ...current,
    canViewActivity: flags.canViewActivity,
    canInspection: flags.canInspection,
  };
  const now = new Date().toISOString();
  const existing = await getPlatformAccessRow(targetUserId);

  if (existing) {
    await mockApi.patch<MockPlatformAccess>(
      `/platform_access/${encodeURIComponent(existing.id)}`,
      {
        matrix: nextMatrix,
        updated_at: now,
      },
    );
  } else {
    await mockApi.post<MockPlatformAccess>("/platform_access", {
      id: randomUUID(),
      user_id: targetUserId,
      matrix: nextMatrix,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });
  }

  await writeAuditLog({
    actorUserId,
    eventId: null,
    action: "update",
    resourceType: "platform_access",
    resourceId: targetUserId,
    module: "user_management",
    descriptionTh: "แก้ไขสิทธิ์แพลตฟอร์ม",
    descriptionEn: "Updated platform access",
    metadata: {
      after: {
        canViewActivity: nextMatrix.canViewActivity,
        canInspection: nextMatrix.canInspection,
      },
    },
  });

  return {
    canViewActivity: nextMatrix.canViewActivity,
    canInspection: nextMatrix.canInspection,
  };
}

export async function updateUserRoleOrEvent(
  targetUserId: string,
  updates: { eventId?: string | null; role?: UserRole },
  actorUserId: string,
): Promise<{ success: boolean }> {
  const account = await getActivePortalAccount(targetUserId);
  if (!account) {
    throw new ServiceError("USER_NOT_FOUND", 404, "User not found");
  }

  const patchBody: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.eventId !== undefined) {
    patchBody.event_id = updates.eventId;
  }

  if (updates.role !== undefined) {
    if (updates.role === "super_admin") {
      patchBody.system_role = "platform_admin";
      patchBody.platform_role_id = "3af7420f-5588-52b9-9ac0-7ea75fd7bdcf";
      patchBody.role_id = null;
      patchBody.event_id = null;
    } else {
      patchBody.system_role = "event_user";
      patchBody.platform_role_id = null;
      const roles = await mockApi.get<RoleRow[]>("/roles");
      const rolePermissions =
        await mockApi.get<RolePermRow[]>("/role_permissions");
      const ownerRoleIds = new Set(
        rolePermissions
          .filter((rp) => rp.permission === "manage_sub_user")
          .map((rp) => rp.role_id),
      );
      if (updates.role === "event_owner") {
        const found = roles.find((r) => ownerRoleIds.has(r.id));
        if (found) patchBody.role_id = found.id;
      } else {
        const found = roles.find((r) => !ownerRoleIds.has(r.id));
        if (found) patchBody.role_id = found.id;
      }
    }
  }

  await mockApi.patch(`/users/${encodeURIComponent(targetUserId)}`, patchBody);

  await writeAuditLog({
    actorUserId,
    eventId: typeof patchBody.event_id === "string" ? patchBody.event_id : null,
    action: "update",
    resourceType: "user",
    resourceId: targetUserId,
    module: "user_management",
    descriptionTh: "อัปเดตข้อมูลผู้ใช้งานและสิทธิ์",
    descriptionEn: "Updated user role or assigned event",
    metadata: {
      after: patchBody,
    },
  });

  return { success: true };
}
