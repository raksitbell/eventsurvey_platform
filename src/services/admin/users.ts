import { MockApiError, mockApi } from "@/core/api/mock-client";
import { ServiceError } from "@/core/api/service-error";
import { writeAuditLog } from "@/core/audit/write";
import { PUBLISHED_DEMO_PASSWORD } from "@/core/auth/demo-preset";
import {
  DEFAULT_ADMIN_MATRIX,
  DEFAULT_SUB_USER_MATRIX,
} from "@/core/auth/event-permissions";
import { getPlatformAccessRow, normalizePlatformMatrix } from "@/core/mock/access";
import { resolveEventTitle } from "@/core/mock/event-title";
import { isActiveMockUser, mapMockUserToUser, resolveAppRole } from "@/core/mock/map-user";
import { getRolePermissions } from "@/core/mock/role-permissions";
import { isTrialAccount } from "@/core/mock/trial-accounts";
import { canCreatePublicDemoTrial, isPublicDemoLoginBlocked } from "@/services/auth/public-demo";
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

async function readManagedUser(userId: string, trialOnly: boolean): Promise<MockUser> {
  const current = await mockApi
    .getFresh<MockUser>(`/users/${encodeURIComponent(userId)}`)
    .catch((error: unknown) => {
      if (error instanceof MockApiError && error.status === 404) return null;
      throw error;
    });
  if (
    !current ||
    current.id !== userId ||
    !isListedPortalUser(current) ||
    (trialOnly && !isTrialAccount(current))
  ) {
    throw new ServiceError("USER_NOT_FOUND", 404, "User not found");
  }
  return current;
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

function passwordForNewUser(input: AdminUserWriteInput): string {
  if (input.usePublishedPassword) {
    if (!input.isTrial || input.password !== undefined) {
      throw new ServiceError("INVALID_PUBLISHED_PASSWORD", 400);
    }
    if (!canCreatePublicDemoTrial()) {
      throw new ServiceError("PUBLIC_DEMO_UNAVAILABLE", 403);
    }
    return PUBLISHED_DEMO_PASSWORD;
  }
  if (!input.password) throw new ServiceError("PASSWORD_REQUIRED", 400);
  return validatePassword(input.password);
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
  const active = rows.find((row) => row.event_id === eventId && !row.deleted_at);
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
  } else {
    await mockApi.post<MockEventAccess>("/event_access", {
      id: randomUUID(),
      user_id: userId,
      created_at: now,
      ...payload,
    });
  }
  for (const row of rows) {
    if (row.deleted_at || row.id === active?.id) continue;
    await mockApi.patch(`/event_access/${encodeURIComponent(row.id)}`, {
      deleted_at: now,
      updated_at: now,
    });
  }
}

async function findLiveEvent(eventId: string): Promise<MockEvent | null> {
  try {
    const event = await mockApi.getFresh<MockEvent>(`/events/${encodeURIComponent(eventId)}`);
    return event?.id === eventId && !event.deleted_at ? event : null;
  } catch (error) {
    if (error instanceof MockApiError && error.status === 404) return null;
    throw error;
  }
}

function canAddExistingTrialAccount(user: MockUser, hasLiveEvent: boolean) {
  return isActiveMockUser(user) &&
    !!resolveAppRole(user) &&
    !!user.email && user.email === user.email.trim() &&
    !!user.password && !isPublicDemoLoginBlocked(user) &&
    (user.password !== PUBLISHED_DEMO_PASSWORD ||
      (user.system_role === "event_user" && canCreatePublicDemoTrial())) &&
    (user.system_role === "platform_admin" || hasLiveEvent);
}

export async function listExistingTrialCandidates() {
  const [users, events] = await Promise.all([
    mockApi.getFresh<MockUser[]>("/users?_sort=created_at&_order=desc"),
    mockApi.getFresh<MockEvent[]>("/events"),
  ]);
  const liveEvents = new Set(events.filter((event) => !event.deleted_at).map((event) => event.id));
  return users
    .filter((user) => !isTrialAccount(user) && canAddExistingTrialAccount(user, liveEvents.has(user.event_id ?? "")))
    .map((user) => ({
      id: user.id,
      name: user.display_name ?? "",
      email: user.email,
      ...(user.password === PUBLISHED_DEMO_PASSWORD ? { usesPublishedPassword: true } : {}),
    }));
}

export async function setExistingTrialAccount(
  targetUserId: string,
  isTrial: boolean,
  actorUserId: string,
): Promise<{ success: true }> {
  const user = await readManagedUser(targetUserId, false);
  if (isTrialAccount(user) === isTrial && user.trial_added_from_existing === isTrial) {
    return { success: true };
  }

  if (isTrial) {
    const hasLiveEvent = user.system_role === "event_user" &&
      !!user.event_id && !!await findLiveEvent(user.event_id);
    if (isTrialAccount(user) || !canAddExistingTrialAccount(user, hasLiveEvent)) {
      throw new ServiceError("TRIAL_USER_INELIGIBLE", 409);
    }
  } else if (!user.trial_added_from_existing) {
    throw new ServiceError("TRIAL_USER_INELIGIBLE", 409);
  }

  await mockApi.patch(`/users/${encodeURIComponent(user.id)}`, {
    is_trial: isTrial,
    trial_added_from_existing: isTrial,
    ...(user.password === PUBLISHED_DEMO_PASSWORD ? { uses_published_trial_password: isTrial } : {}),
    updated_at: new Date().toISOString(),
  });
  await writeAuditLog({
    actorUserId,
    eventId: user.event_id,
    action: "update",
    resourceType: "user",
    resourceId: user.id,
    module: "user_management",
    descriptionTh: isTrial ? "เพิ่มบัญชีเดิมในรายการบัญชีเดโม" : "นำบัญชีเดิมออกจากรายการบัญชีเดโม",
    descriptionEn: isTrial ? "Added existing user to demo accounts" : "Removed existing user from demo accounts",
  });
  return { success: true };
}

/** Bind users + events + event_translations + event_access for the admin users table */
export async function getBoundAdminUsers(
  role?: string,
  locale: Locale = routing.defaultLocale,
  trialOnly = false,
): Promise<AdminUsersResponse> {
  const getUsers = trialOnly ? mockApi.getFresh : mockApi.get;
  const [mockUsers, events, translations, eventAccess, platformAccess] =
    await Promise.all([
      getUsers<MockUser[]>("/users?_sort=created_at&_order=desc"),
      mockApi.getFresh<MockEvent[]>("/events"),
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
  const mockById = new Map(mockUsers.map((user) => [user.id, user]));
  const accessByUser = new Map(
    eventAccess
      .filter((row) => !row.deleted_at && row.event_id === mockById.get(row.user_id)?.event_id)
      .map((row) => [row.user_id, row]),
  );

  const listedUsers = mockUsers.filter(
    (user) => isListedPortalUser(user) && (!trialOnly || isTrialAccount(user)),
  );
  const permissionsByUserId = new Map<string, Awaited<ReturnType<typeof getRolePermissions>>>();
  await Promise.all(
    listedUsers.map(async (mock) => {
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

  let portalUsers = listedUsers
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
    const owner = user.ownerId ? usersById.get(user.ownerId) : null;
    const mock = mockById.get(user.id);
    const eventId = mock?.event_id && liveEvents.has(mock.event_id) ? mock.event_id : null;
    const eventName = eventId ? resolveEventTitle(translations, eventId, locale) : null;

    const customRoleName =
      eventId && user.role === "sub_user"
        ? (accessByUser.get(user.id)?.role_name ?? null)
        : null;

    const platformAccess =
      user.role === "super_admin"
        ? normalizePlatformMatrix(platformByUser.get(user.id)?.matrix)
        : undefined;

    return {
      id: user.id,
      name: user.name ?? "",
      email: user.email,
      phone: mock?.phone ?? null,
      role: user.role,
      status: user.status,
      ownerId: user.ownerId,
      ownerName: owner?.name ?? null,
      canViewSensitiveData: user.canViewSensitiveData,
      eventId,
      eventName,
      customRoleName,
      ...(trialOnly && mock?.trial_added_from_existing ? { trialAddedFromExisting: true } : {}),
      lastActiveAt: mock?.updated_at ?? mock?.joined_at ?? user.updatedAt,
      ...(platformAccess
        ? {
            platformAccess,
            canViewActivity: platformAccess.canViewActivity,
            canInspection: platformAccess.canInspection,
          }
        : {}),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
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
): Promise<AdminUserWriteResult> {
  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  const role = input.role;
  const password = passwordForNewUser(input);

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
    const event = await findLiveEvent(requestedEvent);
    if (!event) throw new ServiceError("EVENT_NOT_FOUND", 400, "Event not found");
    eventId = event.id;
  }
  if (role === "super_admin") {
    eventId = null;
  }

  const now = new Date().toISOString();
  const userId = randomUUID();
  const isPlatform = role === "super_admin";

  await mockApi.post<MockUser>("/users", {
    id: userId,
    email,
    is_trial: input.isTrial ?? false,
    uses_published_trial_password: input.usePublishedPassword ?? false,
    password,
    display_name: name,
    system_role: isPlatform ? "platform_admin" : "event_user",
    event_id: eventId,
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
  trialOnly = false,
): Promise<{ success: boolean }> {
  const current = await readManagedUser(targetUserId, trialOnly);

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
  }
  if (nextEventId && !(await findLiveEvent(nextEventId))) {
    if (updates.eventId !== undefined) {
      throw new ServiceError("EVENT_NOT_FOUND", 400, "Event not found");
    }
    nextEventId = null;
  }
  if (needsEvent(nextRole) && !nextEventId) {
    throw new ServiceError("EVENT_REQUIRED", 400, "Event required");
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
    if (current.is_trial == null && email !== normalizeEmail(current.email ?? "")) {
      patchBody.is_trial = isTrialAccount(current);
    }
  }

  const password = typeof updates.password === "string" && updates.password.length > 0
    ? validatePassword(updates.password)
    : undefined;
  if (password && current.status === "invited") {
    patchBody.status = "active";
    patchBody.joined_at = current.joined_at ?? new Date().toISOString();
  }

  // Clear role references only on records created before access matrices.
  if ("platform_role_id" in current) patchBody.platform_role_id = null;
  if ("role_id" in current) patchBody.role_id = null;
  if (nextRole === "super_admin") {
    patchBody.system_role = "platform_admin";
    patchBody.event_id = null;
  } else {
    patchBody.system_role = "event_user";
    patchBody.event_id = nextEventId;
  }

  await mockApi.patch(`/users/${encodeURIComponent(targetUserId)}`, {
    ...patchBody,
    ...(password ? { password, uses_published_trial_password: false } : {}),
  });

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
  trialOnly = false,
): Promise<AdminUserListItem | null> {
  const data = await getBoundAdminUsers(undefined, locale, trialOnly);
  return data.users.find((user) => user.id === userId) ?? null;
}

export async function deleteAdminUser(
  targetUserId: string,
  actorUserId: string,
  trialOnly = false,
): Promise<{ success: boolean }> {
  if (targetUserId === actorUserId) {
    throw new ServiceError("CANNOT_DELETE_SELF", 400, "Cannot delete yourself");
  }

  const user = await readManagedUser(targetUserId, trialOnly);
  if (trialOnly && user.trial_added_from_existing) {
    throw new ServiceError("TRIAL_USER_INELIGIBLE", 409);
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
