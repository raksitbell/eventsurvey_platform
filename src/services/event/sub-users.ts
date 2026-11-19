import { mockApi, MockApiError } from "@/core/api/mock-client";
import { ServiceError } from "@/core/api/service-error";
import { writeAuditLog } from "@/core/audit/write";
import {
  deserializePermissionMatrix,
  serializePermissionMatrix,
} from "@/core/auth/event-permissions";
import { sendSetupPasswordInvite } from "@/core/mail/send-invite";
import {
  eventMatrixToLegacyCodes,
  getEventAccessForUser,
} from "@/core/mock/access";
import { isActiveMockUser } from "@/core/mock/map-user";
import type {
  EventSubUserItem,
  InviteSubUserInput,
  InviteSubUserResult,
  SubUsersListResponse,
  UpdateSubUserPermissionsInput,
} from "@/types/event/permissions";
import type {
  MockEvent,
  MockEventAccess,
  MockEventTranslation,
  MockUser,
} from "@/types/mock";
import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";

async function assertEventAdmin(
  eventId: string,
  currentUserId: string,
  options: { inspector?: boolean } = {},
): Promise<MockUser> {
  let currentUser: MockUser;
  try {
    currentUser = await mockApi.get<MockUser>(`/users/${currentUserId}`);
  } catch (error) {
    if (error instanceof MockApiError && error.status === 404) {
      throw new ServiceError("USER_NOT_FOUND", 404);
    }
    throw error;
  }

  if (!currentUser || !isActiveMockUser(currentUser)) {
    throw new ServiceError(
      "FORBIDDEN",
      403,
      "User does not belong to this event",
    );
  }

  if (options.inspector) {
    if (currentUser.system_role !== "platform_admin") {
      throw new ServiceError("FORBIDDEN", 403);
    }
    return currentUser;
  }

  if (currentUser.event_id !== eventId) {
    throw new ServiceError(
      "FORBIDDEN",
      403,
      "User does not belong to this event",
    );
  }

  const access = await getEventAccessForUser(currentUser.id, eventId);
  if (!access.canManageSubUsers) {
    throw new ServiceError(
      "FORBIDDEN",
      403,
      "Only Event Admins can manage sub-users and permissions",
    );
  }

  return currentUser;
}

function toSubUserItem(
  user: MockUser,
  access: Awaited<ReturnType<typeof getEventAccessForUser>>,
): EventSubUserItem {
  return {
    id: user.id,
    name: user.display_name,
    email: user.email,
    roleId: access.row?.id ?? null,
    customRoleName: access.roleName,
    status: user.status,
    joinedAt: user.joined_at,
    createdAt: user.created_at,
    permissions: access.matrix,
    rawPermissions: eventMatrixToLegacyCodes(
      access.matrix,
      access.canManageSubUsers,
    ),
  };
}

export async function getSubUsers(
  eventId: string,
  currentUserId: string,
  options: { inspector?: boolean } = {},
): Promise<SubUsersListResponse> {
  const [mockUsers, eventAccessRows] = await Promise.all([
    mockApi.get<MockUser[]>(
      `/users?event_id=${encodeURIComponent(eventId)}&_sort=created_at&_order=asc`,
    ),
    mockApi.get<MockEventAccess[]>(
      `/event_access?event_id=${encodeURIComponent(eventId)}`,
    ),
  ]);

  const members = mockUsers.filter(
    (user) =>
      user.event_id === eventId &&
      user.system_role === "event_user" &&
      user.status !== "removed" &&
      !user.removed_at,
  );
  const accessByUser = new Map(
    eventAccessRows
      .filter((row) => row.event_id === eventId && !row.deleted_at)
      .map((row) => [row.user_id, row]),
  );

  const currentAccess = accessByUser.get(currentUserId);
  const canManageSubUsers = options.inspector
    ? true
    : Boolean(currentAccess?.can_manage_sub_users);

  const subUsersList: EventSubUserItem[] = [];
  for (const user of members) {
    const access = await getEventAccessForUser(user.id, eventId);
    subUsersList.push(toSubUserItem(user, access));
  }

  return {
    subUsers: subUsersList,
    canManageSubUsers,
  };
}

async function getEventMember(
  eventId: string,
  userId: string,
): Promise<MockUser> {
  let user: MockUser | null;
  try {
    user = await mockApi.get<MockUser | null>(`/users/${userId}`);
  } catch (error) {
    if (error instanceof MockApiError && error.status === 404) {
      throw new ServiceError("USER_NOT_FOUND", 404);
    }
    throw error;
  }

  if (!user) throw new ServiceError("USER_NOT_FOUND", 404);
  if (user.event_id !== eventId) {
    throw new ServiceError("USER_NOT_IN_EVENT", 400);
  }
  return user;
}

export async function updateSubUserPermissions(
  eventId: string,
  subUserId: string,
  input: UpdateSubUserPermissionsInput,
  currentUserId: string,
  options: { inspector?: boolean } = {},
): Promise<EventSubUserItem> {
  await assertEventAdmin(eventId, currentUserId, options);

  const targetUser = await getEventMember(eventId, subUserId);
  if (
    targetUser.system_role !== "event_user" ||
    targetUser.status === "removed" ||
    targetUser.removed_at
  ) {
    throw new ServiceError("USER_NOT_IN_EVENT", 400);
  }

  const existing = await getEventAccessForUser(subUserId, eventId);
  if (existing.canManageSubUsers) {
    throw new ServiceError("FORBIDDEN", 403);
  }

  const permissionMatrix = deserializePermissionMatrix(
    serializePermissionMatrix(input.permissions),
  );
  const roleName =
    input.roleName?.trim() || existing.roleName || "Sub-User Role";
  const now = new Date().toISOString();

  let row = existing.row;
  if (row) {
    row = await mockApi.patch<MockEventAccess>(
      `/event_access/${encodeURIComponent(row.id)}`,
      {
        role_name: roleName,
        can_manage_sub_users: false,
        matrix: permissionMatrix,
        updated_at: now,
      },
    );
  } else {
    row = await mockApi.post<MockEventAccess>("/event_access", {
      id: randomUUID(),
      user_id: subUserId,
      event_id: eventId,
      role_name: roleName,
      can_manage_sub_users: false,
      matrix: permissionMatrix,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });
  }

  await mockApi.patch<MockUser>(`/users/${encodeURIComponent(subUserId)}`, {
    role_assigned_by_user_id: currentUserId,
    role_assigned_at: now,
    updated_at: now,
  });

  await writeAuditLog({
    actorUserId: currentUserId,
    eventId,
    action: "update",
    resourceType: "event_access",
    resourceId: subUserId,
    module: "user_management",
    descriptionTh: "แก้ไขสิทธิ์ผู้ใช้ย่อย",
    descriptionEn: "Updated sub-user permissions",
    metadata: {
      before: existing.matrix,
      after: permissionMatrix,
      roleName,
    },
  });

  return toSubUserItem(targetUser, {
    row,
    matrix: permissionMatrix,
    canManageSubUsers: false,
    roleName,
  });
}

const pendingInviteEmails = new Set<string>();

export async function inviteSubUser(
  eventId: string,
  input: InviteSubUserInput,
  currentUserId: string,
  options: { inspector?: boolean } = {},
): Promise<InviteSubUserResult> {
  await assertEventAdmin(eventId, currentUserId, options);

  const email = input.email.trim().toLowerCase();
  if (!z.email().max(320).safeParse(email).success) {
    throw new ServiceError("INVALID_EMAIL", 400);
  }
  if (pendingInviteEmails.has(email)) {
    throw new ServiceError("EMAIL_ALREADY_EXISTS", 409);
  }

  pendingInviteEmails.add(email);
  try {
    return await createSubUserInvite(eventId, { ...input, email }, currentUserId);
  } finally {
    pendingInviteEmails.delete(email);
  }
}

async function createSubUserInvite(
  eventId: string,
  input: InviteSubUserInput,
  currentUserId: string,
): Promise<InviteSubUserResult> {
  const { email } = input;
  const [existingUsers, event, translations] = await Promise.all([
    mockApi.get<MockUser[]>(`/users?email=${encodeURIComponent(email)}`),
    mockApi.get<MockEvent>(`/events/${encodeURIComponent(eventId)}`),
    mockApi.get<MockEventTranslation[]>(
      `/event_translations?event_id=${encodeURIComponent(eventId)}`,
    ),
  ]);
  if (
    existingUsers.some(
      (user) =>
        user.email.trim().toLowerCase() === email &&
        user.status !== "removed" &&
        !user.removed_at,
    )
  ) {
    throw new ServiceError(
      "EMAIL_ALREADY_EXISTS",
      409,
      "User email is already registered",
    );
  }
  if (event?.id !== eventId || event.deleted_at) {
    throw new ServiceError("EVENT_NOT_FOUND", 404);
  }

  const now = new Date().toISOString();
  const userId = randomUUID();
  const roleName = input.roleName.trim() || "Sub-User Role";
  const permissionMatrix = deserializePermissionMatrix(
    serializePermissionMatrix(input.permissions),
  );
  const accessId = randomUUID();

  await mockApi.post<MockEventAccess>("/event_access", {
    id: accessId,
    user_id: userId,
    event_id: eventId,
    role_name: roleName,
    can_manage_sub_users: false,
    matrix: permissionMatrix,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  });

  const newUser: MockUser = {
    id: userId,
    email,
    password: randomBytes(18).toString("base64url"),
    display_name: input.name.trim(),
    system_role: "event_user",
    platform_role_id: null,
    event_id: eventId,
    role_id: null,
    role_assigned_by_user_id: currentUserId,
    role_assigned_at: now,
    status: "invited",
    invited_by_user_id: currentUserId,
    joined_at: null,
    created_at: now,
    updated_at: now,
    removed_at: null,
  };

  try {
    await mockApi.post<MockUser>("/users", newUser);
  } catch (error) {
    await mockApi.delete(`/event_access/${accessId}`).catch(() => undefined);
    throw error;
  }

  const eventTitles = translations.filter((row) => row.event_id === eventId);
  let inviteSent = false;
  try {
    await sendSetupPasswordInvite({
      to: email,
      displayName: newUser.display_name,
      userId,
      audience: "event-member",
      eventTitleTh: eventTitles.find((row) => row.locale_code === "th")?.title,
      eventTitleEn: eventTitles.find((row) => row.locale_code === "en")?.title,
      eventTitleFallback: event.slug,
    });
    inviteSent = true;
  } catch {
    // Keep the account pending and report the actual delivery outcome.
  }

  await writeAuditLog({
    actorUserId: currentUserId,
    eventId,
    action: "create",
    resourceType: "sub_user",
    resourceId: userId,
    module: "user_management",
    descriptionTh: "เชิญผู้ใช้ย่อย",
    descriptionEn: "Invited a sub-user",
    metadata: { email, roleName },
  });

  return {
    ...toSubUserItem(newUser, {
      row: {
        id: accessId,
        user_id: userId,
        event_id: eventId,
        role_name: roleName,
        can_manage_sub_users: false,
        matrix: permissionMatrix,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      matrix: permissionMatrix,
      canManageSubUsers: false,
      roleName,
    }),
    inviteSent,
  };
}

export async function removeSubUser(
  eventId: string,
  subUserId: string,
  currentUserId: string,
  options: { inspector?: boolean } = {},
): Promise<void> {
  await assertEventAdmin(eventId, currentUserId, options);

  if (subUserId === currentUserId) {
    throw new ServiceError(
      "CANNOT_REMOVE_SELF",
      400,
      "Event Admin cannot remove themselves",
    );
  }

  const targetUser = await getEventMember(eventId, subUserId);
  if (targetUser.system_role !== "event_user") {
    throw new ServiceError("USER_NOT_IN_EVENT", 400);
  }
  if (targetUser.status === "removed" || targetUser.removed_at) return;

  const now = new Date().toISOString();
  await mockApi.patch<MockUser>(`/users/${subUserId}`, {
    status: "removed",
    removed_at: now,
    updated_at: now,
  });

  await writeAuditLog({
    actorUserId: currentUserId,
    eventId,
    action: "delete",
    resourceType: "sub_user",
    resourceId: subUserId,
    module: "user_management",
    descriptionTh: "ลบผู้ใช้ย่อยออกจากอีเวนต์",
    descriptionEn: "Removed a sub-user from the event",
  });
}
