import { mockApi } from "@/core/api/mock-client";
import { ServiceError } from "@/core/api/service-error";
import { writeAuditLog } from "@/core/audit/write";
import {
  DEFAULT_ADMIN_MATRIX,
  DEFAULT_SUB_USER_MATRIX,
} from "@/core/auth/event-permissions";
import {
  maskName,
  mayViewPii,
  projectUserPii,
  type PiiViewer,
} from "@/core/auth/pii";
import { getPlatformAccessRow, normalizePlatformMatrix } from "@/core/mock/access";
import { resolveEventTitle } from "@/core/mock/event-title";
import { mapMockUserToUser } from "@/core/mock/map-user";
import { getRolePermissions } from "@/core/mock/role-permissions";
import { getActivePortalAccount } from "@/services/auth/session";
import { routing, type Locale } from "@/i18n/routing";
import type {
  AdminUserListItem,
  AdminUsersResponse,
  AdminUserWriteInput,
  AdminUserWriteResult,
  PlatformAccessMatrix,
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

const PORTAL_ROLES: UserRole[] = ["super_admin", "event_owner", "sub_user"];

const NEW_PLATFORM_MATRIX: PlatformAccessMatrix = {
  overview: "view_only",
  events: "can_edit",
  users: "can_edit",
  canViewActivity: false,
  canInspection: false,
  canViewUnmaskedPii: false,
};

function isListedPortalUser(user: MockUser): boolean {
  return !user.removed_at && user.status !== "removed";
}

/** Only Event Editors must pick an event in User Management. */
function needsEvent(role: UserRole): boolean {
  return role === "sub_user";
}

function mapListedPortalUser(
  mock: MockUser,
  permissions: Awaited<ReturnType<typeof getRolePermissions>>,
): User | null {
  const mapped = mapMockUserToUser(mock, permissions);
  if (mapped) return mapped;
  // Unassigned event accounts (assignable Event Owners) still appear in admin list.
  if (mock.system_role === "event_user" && !mock.event_id) {
    return {
      id: mock.id,
      name: mock.display_name?.trim() || "",
      email: mock.email ?? "",
      phone: null,
      role: "event_owner",
      status: mock.status === "active" ? "active" : "inactive",
      ownerId: null,
      canViewSensitiveData: false,
      isDeleted: false,
      deletedAt: null,
      anonymizedAt: null,
      createdAt: mock.created_at,
      updatedAt: mock.updated_at,
    };
  }
  return null;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const MIN_PASSWORD_LENGTH = 8;

function validatePassword(password: string): string {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new ServiceError(
      "INVALID_PASSWORD",
      400,
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    );
  }
  return password;
}

async function findUserByEmail(email: string): Promise<MockUser | null> {
  const rows = await mockApi.get<MockUser[]>(
    `/users?email=${encodeURIComponent(email)}`,
  );
  return rows.find((row) => !row.removed_at && row.status !== "removed") ?? null;
}

async function softDeleteEventAccess(userId: string): Promise<void> {
  const rows = await mockApi.get<MockEventAccess[]>(
    `/event_access?user_id=${encodeURIComponent(userId)}`,
  );
  const now = new Date().toISOString();
  await Promise.all(
    rows
      .filter((row) => !row.deleted_at)
      .map((row) =>
        mockApi.patch(`/event_access/${encodeURIComponent(row.id)}`, {
          deleted_at: now,
          updated_at: now,
        }),
      ),
  );
}

async function softDeletePlatformAccess(userId: string): Promise<void> {
  const row = await getPlatformAccessRow(userId);
  if (!row) return;
  const now = new Date().toISOString();
  await mockApi.patch(`/platform_access/${encodeURIComponent(row.id)}`, {
    deleted_at: now,
    updated_at: now,
  });
}

async function ensurePlatformAccess(userId: string): Promise<void> {
  const existing = await getPlatformAccessRow(userId);
  const now = new Date().toISOString();
  if (existing) {
    await mockApi.patch(`/platform_access/${encodeURIComponent(existing.id)}`, {
      matrix: existing.matrix ?? NEW_PLATFORM_MATRIX,
      updated_at: now,
      deleted_at: null,
    });
    return;
  }
  await mockApi.post<MockPlatformAccess>("/platform_access", {
    id: randomUUID(),
    user_id: userId,
    matrix: NEW_PLATFORM_MATRIX,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  });
}

async function upsertEventAccess(
  userId: string,
  eventId: string,
  role: "event_owner" | "sub_user",
): Promise<void> {
  const now = new Date().toISOString();
  const isOwner = role === "event_owner";
  const rows = await mockApi.get<MockEventAccess[]>(
    `/event_access?user_id=${encodeURIComponent(userId)}`,
  );
  const active = rows.find((row) => !row.deleted_at);
  const payload = {
    event_id: eventId,
    role_name: isOwner ? "Event Admin" : "Staff",
    can_manage_sub_users: isOwner,
    matrix: isOwner ? { ...DEFAULT_ADMIN_MATRIX } : { ...DEFAULT_SUB_USER_MATRIX },
    updated_at: now,
    deleted_at: null,
  };
  if (active) {
    await mockApi.patch(`/event_access/${encodeURIComponent(active.id)}`, payload);
    return;
  }
  await mockApi.post<MockEventAccess>("/event_access", {
    id: randomUUID(),
    user_id: userId,
    created_at: now,
    ...payload,
  });
}

async function assertLiveEvent(eventId: string): Promise<MockEvent> {
  const event = await mockApi
    .get<MockEvent>(`/events/${encodeURIComponent(eventId)}`)
    .catch(() => null);
  if (!event || event.deleted_at) {
    throw new ServiceError("EVENT_NOT_FOUND", 400, "Event not found");
  }
  return event;
}

/** Bind users + events + event_translations + event_access for the admin users table */
export async function getBoundAdminUsers(
  role?: string,
  locale: Locale = routing.defaultLocale,
  viewer?: PiiViewer,
): Promise<AdminUsersResponse> {
  const [mockUsers, events, translations, eventAccess, platformAccess] =
    await Promise.all([
      mockApi.get<MockUser[]>("/users?_sort=created_at&_order=desc"),
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

  const liveEvents = new Set(
    events.filter((event) => !event.deleted_at).map((event) => event.id),
  );
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
        mapListedPortalUser(
          mock,
          permissionsByUserId.get(mock.id) ?? [],
        ),
      )
      .filter((user): user is User => Boolean(user))
      .map((user) => [user.id, user]),
  );

  let portalUsers = mockUsers
    .filter(isListedPortalUser)
    .map((mock) =>
      mapListedPortalUser(mock, permissionsByUserId.get(mock.id) ?? []),
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

    const platformAccess =
      user.role === "super_admin"
        ? normalizePlatformMatrix(platformByUser.get(user.id)?.matrix)
        : undefined;

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
      ...(platformAccess
        ? {
            platformAccess,
            canViewActivity: platformAccess.canViewActivity,
            canInspection: platformAccess.canInspection,
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

/** Update platform matrix for a super_admin (creates platform_access if missing). */
export async function updatePlatformAccessFlags(
  targetUserId: string,
  matrix: PlatformAccessMatrix,
  actorUserId: string,
): Promise<PlatformAccessMatrix> {
  const account = await getActivePortalAccount(targetUserId);
  if (!account || account.user.role !== "super_admin") {
    throw new ServiceError("INVALID_TARGET", 400, "Not a platform admin");
  }

  const nextMatrix = normalizePlatformMatrix(matrix);
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
      after: nextMatrix,
    },
  });

  return nextMatrix;
}

export async function createAdminUser(
  input: AdminUserWriteInput,
  actorUserId: string,
  locale: Locale = routing.defaultLocale,
): Promise<AdminUserWriteResult> {
  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  const role = input.role;

  if (!name || !email) {
    throw new ServiceError("VALIDATION_ERROR", 400, "Name and email required");
  }
  if (!PORTAL_ROLES.includes(role)) {
    throw new ServiceError("VALIDATION_ERROR", 400, "Invalid role");
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    throw new ServiceError("EMAIL_EXISTS", 409, "Email already in use");
  }

  let eventId: string | null = null;
  const requestedEvent = input.eventId?.trim() || "";
  if (needsEvent(role) && !requestedEvent) {
    throw new ServiceError("EVENT_REQUIRED", 400, "Event required");
  }
  if (requestedEvent && (needsEvent(role) || role === "event_owner")) {
    const event = await assertLiveEvent(requestedEvent);
    eventId = event.id;
  }
  if (role === "super_admin") {
    eventId = null;
  }

  const password = validatePassword(input.password);
  const now = new Date().toISOString();
  const userId = randomUUID();
  const isPlatform = role === "super_admin";

  await mockApi.post<MockUser>("/users", {
    id: userId,
    email,
    password,
    display_name: name,
    system_role: isPlatform ? "platform_admin" : "event_user",
    platform_role_id: null,
    event_id: eventId,
    role_id: null,
    role_assigned_by_user_id: actorUserId,
    role_assigned_at: now,
    status: "active",
    invited_by_user_id: actorUserId,
    joined_at: now,
    created_at: now,
    updated_at: now,
    removed_at: null,
  });

  if (isPlatform) {
    await ensurePlatformAccess(userId);
  } else if (eventId && (role === "event_owner" || role === "sub_user")) {
    await upsertEventAccess(userId, eventId, role);
  }

  await writeAuditLog({
    actorUserId,
    eventId,
    action: "create",
    resourceType: "user",
    resourceId: userId,
    module: "user_management",
    descriptionTh: "สร้างบัญชีผู้ใช้พร้อมรหัสผ่าน",
    descriptionEn: "Created user account with password",
    metadata: { role, eventId, passwordSet: true },
  });

  return { id: userId, inviteSent: false, passwordSet: true };
}

export async function updateUserRoleOrEvent(
  targetUserId: string,
  updates: {
    eventId?: string | null;
    role?: UserRole;
    name?: string;
    email?: string;
    password?: string;
  },
  actorUserId: string,
): Promise<{ success: boolean }> {
  const account = await getActivePortalAccount(targetUserId);
  if (!account) {
    // Allow editing invited accounts that getActivePortalAccount may skip.
    const raw = await mockApi
      .get<MockUser>(`/users/${encodeURIComponent(targetUserId)}`)
      .catch(() => null);
    if (!raw || raw.removed_at || raw.status === "removed") {
      throw new ServiceError("USER_NOT_FOUND", 404, "User not found");
    }
  }

  const current = await mockApi.get<MockUser>(
    `/users/${encodeURIComponent(targetUserId)}`,
  );
  if (!current || current.removed_at || current.status === "removed") {
    throw new ServiceError("USER_NOT_FOUND", 404, "User not found");
  }

  const currentPermissions = await getRolePermissions(
    current.id,
    current.event_id,
  );
  const currentRole =
    mapListedPortalUser(current, currentPermissions)?.role ?? null;
  const nextRole = updates.role ?? currentRole;
  if (!nextRole || !PORTAL_ROLES.includes(nextRole)) {
    throw new ServiceError("VALIDATION_ERROR", 400, "Invalid role");
  }

  let nextEventId: string | null = current.event_id;
  if (nextRole === "super_admin") {
    nextEventId = null;
  } else if (updates.eventId !== undefined) {
    nextEventId = updates.eventId?.trim() || null;
  } else if (nextRole === "event_owner" && updates.role === "event_owner") {
    // Keep existing assignment when promoting within event roles.
    nextEventId = current.event_id;
  }
  if (needsEvent(nextRole) && !nextEventId) {
    throw new ServiceError("EVENT_REQUIRED", 400, "Event required");
  }
  if (nextRole === "event_owner" && updates.eventId === null) {
    nextEventId = null;
  }
  if (nextEventId) {
    await assertLiveEvent(nextEventId);
  }

  const patchBody: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof updates.name === "string") {
    const name = updates.name.trim();
    if (!name) {
      throw new ServiceError("VALIDATION_ERROR", 400, "Name required");
    }
    patchBody.display_name = name;
  }

  if (typeof updates.email === "string") {
    const email = normalizeEmail(updates.email);
    if (!email) {
      throw new ServiceError("VALIDATION_ERROR", 400, "Email required");
    }
    const conflict = await findUserByEmail(email);
    if (conflict && conflict.id !== targetUserId) {
      throw new ServiceError("EMAIL_EXISTS", 409, "Email already in use");
    }
    patchBody.email = email;
  }

  if (typeof updates.password === "string" && updates.password.length > 0) {
    patchBody.password = validatePassword(updates.password);
    if (current.status === "invited") {
      patchBody.status = "active";
      patchBody.joined_at = current.joined_at ?? new Date().toISOString();
    }
  }

  if (nextRole === "super_admin") {
    patchBody.system_role = "platform_admin";
    patchBody.platform_role_id = null;
    patchBody.role_id = null;
    patchBody.event_id = null;
  } else {
    patchBody.system_role = "event_user";
    patchBody.platform_role_id = null;
    patchBody.role_id = null;
    patchBody.event_id = nextEventId;
  }

  await mockApi.patch(`/users/${encodeURIComponent(targetUserId)}`, patchBody);

  if (nextRole === "super_admin") {
    await softDeleteEventAccess(targetUserId);
    await ensurePlatformAccess(targetUserId);
  } else {
    await softDeletePlatformAccess(targetUserId);
    if (nextEventId && (nextRole === "event_owner" || nextRole === "sub_user")) {
      await upsertEventAccess(targetUserId, nextEventId, nextRole);
    } else if (nextRole === "event_owner" && !nextEventId) {
      await softDeleteEventAccess(targetUserId);
    }
  }

  await writeAuditLog({
    actorUserId,
    eventId: nextEventId,
    action: "update",
    resourceType: "user",
    resourceId: targetUserId,
    module: "user_management",
    descriptionTh: "อัปเดตข้อมูลผู้ใช้งานและสิทธิ์",
    descriptionEn: "Updated user role or assigned event",
    metadata: {
      after: { ...patchBody, role: nextRole },
    },
  });

  return { success: true };
}

export async function getAdminUserById(
  userId: string,
  locale: Locale = routing.defaultLocale,
  viewer?: PiiViewer,
): Promise<AdminUserListItem | null> {
  const data = await getBoundAdminUsers(undefined, locale, viewer);
  return data.users.find((user) => user.id === userId) ?? null;
}

export async function deleteAdminUser(
  targetUserId: string,
  actorUserId: string,
): Promise<{ success: boolean }> {
  if (targetUserId === actorUserId) {
    throw new ServiceError("CANNOT_DELETE_SELF", 400, "Cannot delete yourself");
  }

  const current = await mockApi
    .get<MockUser>(`/users/${encodeURIComponent(targetUserId)}`)
    .catch(() => null);
  if (!current || current.removed_at || current.status === "removed") {
    throw new ServiceError("USER_NOT_FOUND", 404, "User not found");
  }

  const now = new Date().toISOString();
  await mockApi.patch(`/users/${encodeURIComponent(targetUserId)}`, {
    status: "removed",
    removed_at: now,
    updated_at: now,
    event_id: null,
  });
  await softDeleteEventAccess(targetUserId);
  await softDeletePlatformAccess(targetUserId);

  await writeAuditLog({
    actorUserId,
    eventId: null,
    action: "delete",
    resourceType: "user",
    resourceId: targetUserId,
    module: "user_management",
    descriptionTh: "ลบบัญชีผู้ใช้",
    descriptionEn: "Deleted user account",
  });

  return { success: true };
}
