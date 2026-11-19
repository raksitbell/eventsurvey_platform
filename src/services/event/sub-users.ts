import { mockApi, MockApiError } from "@/core/api/mock-client";
import { ServiceError } from "@/core/api/service-error";
import {
  deserializePermissionMatrix,
  matrixToMockPermissions,
  serializePermissionMatrix,
} from "@/core/auth/event-permissions";
import { sendSetupPasswordInvite } from "@/core/mail/send-invite";
import { isActiveMockUser } from "@/core/mock/map-user";
import { getRolePermissions } from "@/core/mock/role-permissions";
import type {
  EventSubUserItem,
  InviteSubUserInput,
  InviteSubUserResult,
  SubUsersListResponse,
  UpdateSubUserPermissionsInput,
} from "@/types/event/permissions";
import type {
  MockEvent,
  MockEventTranslation,
  MockPermissionCode,
  MockRole,
  MockRolePermission,
  MockUser,
} from "@/types/mock";
import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";

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

/**
 * Check if the current user belongs to the event and has the 'manage_sub_user' permission.
 */
async function assertEventAdmin(
  eventId: string,
  currentUserId: string,
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

  if (
    !currentUser ||
    !isActiveMockUser(currentUser) ||
    currentUser.event_id !== eventId
  ) {
    throw new ServiceError(
      "FORBIDDEN",
      403,
      "User does not belong to this event",
    );
  }

  const permissions = await getRolePermissions(currentUser.role_id);
  if (!permissions.includes("manage_sub_user")) {
    throw new ServiceError(
      "FORBIDDEN",
      403,
      "Only Event Admins can manage sub-users and permissions",
    );
  }

  return currentUser;
}

/**
 * List all sub-users belonging to the event with their resolved permission matrix.
 */
export async function getSubUsers(
  eventId: string,
  currentUserId: string,
): Promise<SubUsersListResponse> {
  const [mockUsers, roles, rolePermissions] = await Promise.all([
    mockApi.get<MockUser[]>(
      `/users?event_id=${encodeURIComponent(eventId)}&_sort=created_at&_order=asc`,
    ),
    mockApi.get<MockRole[]>(`/roles?event_id=${encodeURIComponent(eventId)}`),
    mockApi.get<MockRolePermission[]>("/role_permissions"),
  ]);

  const members = mockUsers.filter(
    (user) =>
      user.event_id === eventId &&
      user.system_role === "event_user" &&
      user.status !== "removed" &&
      !user.removed_at,
  );
  const rolesById = new Map(
    roles
      .filter((role) => role.event_id === eventId && !role.deleted_at)
      .map((role) => [role.id, role]),
  );
  const permsByRole = permissionsByRoleId(rolePermissions);
  const currentUser = members.find(
    (user) => user.id === currentUserId && isActiveMockUser(user),
  );
  const currentRoleId = currentUser?.role_id;
  const canManageSubUsers = Boolean(
    currentRoleId &&
    rolesById.has(currentRoleId) &&
    permsByRole.get(currentRoleId)?.includes("manage_sub_user"),
  );

  const subUsersList: EventSubUserItem[] = members.map((user) => {
    const role = user.role_id ? rolesById.get(user.role_id) : null;
    const rawPerms = role ? (permsByRole.get(role.id) ?? []) : [];
    const permissions = deserializePermissionMatrix(
      role?.description,
      rawPerms,
    );

    return {
      id: user.id,
      name: user.display_name,
      email: user.email,
      roleId: role?.id ?? null,
      customRoleName: role?.name ?? null,
      status: user.status,
      joinedAt: user.joined_at,
      createdAt: user.created_at,
      permissions,
      rawPermissions: rawPerms,
    };
  });

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

/**
 * Update the permission matrix and custom role name for a sub-user.
 */
export async function updateSubUserPermissions(
  eventId: string,
  subUserId: string,
  input: UpdateSubUserPermissionsInput,
  currentUserId: string,
): Promise<EventSubUserItem> {
  await assertEventAdmin(eventId, currentUserId);

  const targetUser = await getEventMember(eventId, subUserId);
  if (
    targetUser.system_role !== "event_user" ||
    targetUser.status === "removed" ||
    targetUser.removed_at
  ) {
    throw new ServiceError("USER_NOT_IN_EVENT", 400);
  }
  const currentCodes = await getRolePermissions(targetUser.role_id);
  if (currentCodes.includes("manage_sub_user")) {
    throw new ServiceError("FORBIDDEN", 403);
  }

  const currentRole = targetUser.role_id
    ? await mockApi.get<MockRole>(
        `/roles/${encodeURIComponent(targetUser.role_id)}`,
      )
    : null;
  if (currentRole && (currentRole.event_id !== eventId || currentRole.deleted_at)) {
    throw new ServiceError("FORBIDDEN", 403);
  }
  const permissionMatrix = deserializePermissionMatrix(
    serializePermissionMatrix(input.permissions),
  );
  const serializedMatrix = serializePermissionMatrix(permissionMatrix);
  const newMockCodes = matrixToMockPermissions(permissionMatrix);
  if (currentCodes.includes("view_unmasked_pii")) {
    newMockCodes.push("view_unmasked_pii");
  }
  const roleName = input.roleName?.trim() || currentRole?.name || "Sub-User Role";
  const unchanged =
    currentRole &&
    currentRole.name === roleName &&
    currentRole.description === serializedMatrix &&
    currentCodes.length === newMockCodes.length &&
    newMockCodes.every((code) => currentCodes.includes(code));
  let roleId = currentRole?.id ?? null;
  if (!unchanged) {
    const now = new Date().toISOString();
    const userPath = `/users/${encodeURIComponent(subUserId)}`;
    const staged = await stageSubUserRole({
      eventId,
      actorUserId: currentUserId,
      name: roleName,
      description: serializedMatrix,
      permissions: newMockCodes,
      now,
    });

    // The new grants become active together. Other members can continue
    // using the previous role.
    try {
      await mockApi.patch<MockUser>(userPath, {
        role_id: staged.id,
        role_assigned_by_user_id: currentUserId,
        role_assigned_at: now,
        updated_at: now,
      });
    } catch (error) {
      const assignedUser = await mockApi
        .get<MockUser>(userPath)
        .catch(() => null);
      if (assignedUser?.role_id !== staged.id) {
        if (assignedUser) await discardStagedRole(staged.stagedPaths);
        throw error;
      }
    }
    roleId = staged.id;
  }

  return {
    id: targetUser.id,
    name: targetUser.display_name,
    email: targetUser.email,
    roleId,
    customRoleName: roleName,
    status: targetUser.status,
    joinedAt: targetUser.joined_at,
    createdAt: targetUser.created_at,
    permissions: permissionMatrix,
    rawPermissions: newMockCodes,
  };
}

async function stageSubUserRole({
  eventId,
  actorUserId,
  name,
  description,
  permissions,
  now,
}: {
  eventId: string;
  actorUserId: string;
  name: string;
  description: string;
  permissions: readonly MockPermissionCode[];
  now: string;
}): Promise<{ id: string; stagedPaths: string[] }> {
  const roleId = randomUUID();
  const stagedPaths = [`/roles/${roleId}`];
  try {
    await mockApi.post<MockRole>("/roles", {
      id: roleId,
      event_id: eventId,
      name,
      description,
      created_at: now,
      created_by: actorUserId,
      updated_at: now,
      updated_by: actorUserId,
      deleted_at: null,
    });
    for (const permission of permissions) {
      const id = randomUUID();
      stagedPaths.push(`/role_permissions/${id}`);
      await mockApi.post<MockRolePermission>("/role_permissions", {
        id,
        role_id: roleId,
        permission,
      });
    }
  } catch (error) {
    await discardStagedRole(stagedPaths);
    throw error;
  }

  return { id: roleId, stagedPaths };
}

async function discardStagedRole(paths: string[]): Promise<void> {
  for (const path of paths.reverse()) {
    // An unassigned role cannot authorize anyone. Preserve the original error.
    await mockApi.delete(path).catch(() => undefined);
  }
}

const pendingInviteEmails = new Set<string>();

/** Invite a new sub-user and deliver the signed password setup link. */
export async function inviteSubUser(
  eventId: string,
  input: InviteSubUserInput,
  currentUserId: string,
): Promise<InviteSubUserResult> {
  await assertEventAdmin(eventId, currentUserId);

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
  const newMockCodes = matrixToMockPermissions(permissionMatrix);
  const { id: roleId, stagedPaths } = await stageSubUserRole({
    eventId,
    actorUserId: currentUserId,
    name: roleName,
    description: serializePermissionMatrix(permissionMatrix),
    permissions: newMockCodes,
    now,
  });

  const newUser: MockUser = {
    id: userId,
    email,
    password: randomBytes(18).toString("base64url"),
    display_name: input.name.trim(),
    system_role: "event_user",
    platform_role_id: null,
    event_id: eventId,
    role_id: roleId,
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
    // A lost response may still have created the account with its new role.
    const persistedUser = await mockApi
      .get<MockUser | null>(`/users/${userId}`)
      .catch((lookupError) => {
        if (lookupError instanceof MockApiError && lookupError.status === 404) {
          return null;
        }
        throw error;
      });
    if (!persistedUser) await discardStagedRole(stagedPaths);
    if (persistedUser?.id !== userId || persistedUser.role_id !== roleId) {
      throw error;
    }
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

  return {
    id: userId,
    name: newUser.display_name,
    email: newUser.email,
    roleId,
    customRoleName: roleName,
    status: newUser.status,
    joinedAt: newUser.joined_at,
    createdAt: newUser.created_at,
    permissions: permissionMatrix,
    rawPermissions: newMockCodes,
    inviteSent,
  };
}

/**
 * Soft remove a sub-user from the event.
 */
export async function removeSubUser(
  eventId: string,
  subUserId: string,
  currentUserId: string,
): Promise<void> {
  await assertEventAdmin(eventId, currentUserId);

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
}
