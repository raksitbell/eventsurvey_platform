import { mockApi, MockApiError } from "@/core/api/mock-client";
import { ServiceError } from "@/core/api/service-error";
import {
  deserializePermissionMatrix,
  matrixToMockPermissions,
  serializePermissionMatrix,
} from "@/core/auth/event-permissions";
import { isActiveMockUser } from "@/core/mock/map-user";
import { getRolePermissions } from "@/core/mock/role-permissions";
import type {
  EventSubUserItem,
  InviteSubUserInput,
  SubUsersListResponse,
  UpdateSubUserPermissionsInput,
} from "@/types/event/permissions";
import type {
  MockPermissionCode,
  MockRole,
  MockRolePermission,
  MockUser,
} from "@/types/mock";

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

  const currentUser = mockUsers.find((u) => u.id === currentUserId);
  const currentUserPerms = currentUser?.role_id
    ? (permissionsByRoleId(rolePermissions).get(currentUser.role_id) ?? [])
    : [];
  const canManageSubUsers = currentUserPerms.includes("manage_sub_user");

  const rolesById = new Map(roles.map((r) => [r.id, r]));
  const permsByRole = permissionsByRoleId(rolePermissions);

  // Filter to event sub-users (exclude platform_admin or removed users)
  const subUsersList: EventSubUserItem[] = mockUsers
    .filter((user) => user.status !== "removed" && !user.removed_at)
    .filter((user) => {
      // Exclude platform admin, show event users
      return user.system_role === "event_user";
    })
    .map((user) => {
      const role = user.role_id ? rolesById.get(user.role_id) : null;
      const rawPerms = user.role_id
        ? (permsByRole.get(user.role_id) ?? [])
        : [];
      const permissions = deserializePermissionMatrix(
        role?.description,
        rawPerms,
      );

      return {
        id: user.id,
        name: user.display_name,
        email: user.email,
        roleId: user.role_id,
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

  let targetUser: MockUser;
  try {
    targetUser = await mockApi.get<MockUser>(`/users/${subUserId}`);
  } catch (error) {
    if (error instanceof MockApiError && error.status === 404) {
      throw new ServiceError("USER_NOT_FOUND", 404);
    }
    throw error;
  }

  if (targetUser.event_id !== eventId) {
    throw new ServiceError("USER_NOT_IN_EVENT", 400);
  }

  const now = new Date().toISOString();
  const serializedMatrix = serializePermissionMatrix(input.permissions);
  const newMockCodes = matrixToMockPermissions(input.permissions);

  let roleId = targetUser.role_id;

  if (roleId) {
    // Update existing role
    await mockApi.patch<MockRole>(`/roles/${roleId}`, {
      name: input.roleName || "Custom Sub-User Role",
      description: serializedMatrix,
      updated_at: now,
    });
  } else {
    // Create new role for this sub-user
    roleId = crypto.randomUUID();
    await mockApi.post<MockRole>("/roles", {
      id: roleId,
      event_id: eventId,
      owner_user_id: currentUserId,
      name: input.roleName || "Sub-User Role",
      description: serializedMatrix,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });

    await mockApi.patch<MockUser>(`/users/${subUserId}`, {
      role_id: roleId,
      role_assigned_by_user_id: currentUserId,
      role_assigned_at: now,
      updated_at: now,
    });
  }

  // Sync role_permissions in mock
  // 1. Get existing role permissions for this role
  const existingPerms = await mockApi.get<MockRolePermission[]>(
    `/role_permissions?role_id=${encodeURIComponent(roleId)}`,
  );
  // Delete removed ones (if API supports deletion by ID or just overwrite)
  for (const p of existingPerms) {
    if (!newMockCodes.includes(p.permission)) {
      // Some json-servers identify by compound id or row id
      try {
        await mockApi.delete(
          `/role_permissions/${p.id ?? `${p.role_id}_${p.permission}`}`,
        );
      } catch {
        // Fallback for json-server schemas
      }
    }
  }

  // Add new permissions
  const existingCodes = new Set(existingPerms.map((p) => p.permission));
  for (const code of newMockCodes) {
    if (!existingCodes.has(code)) {
      try {
        await mockApi.post("/role_permissions", {
          role_id: roleId,
          permission: code,
        });
      } catch {
        // Ignore duplicate insert errors in mock
      }
    }
  }

  return {
    id: targetUser.id,
    name: targetUser.display_name,
    email: targetUser.email,
    roleId,
    customRoleName: input.roleName || "Sub-User Role",
    status: targetUser.status,
    joinedAt: targetUser.joined_at,
    createdAt: targetUser.created_at,
    permissions: input.permissions,
    rawPermissions: newMockCodes,
  };
}

/**
 * Invite a new sub-user into the event with a custom permission matrix.
 */
export async function inviteSubUser(
  eventId: string,
  input: InviteSubUserInput,
  currentUserId: string,
): Promise<EventSubUserItem> {
  await assertEventAdmin(eventId, currentUserId);

  // Check email collision
  const existingUsers = await mockApi.get<MockUser[]>(
    `/users?email=${encodeURIComponent(input.email.trim().toLowerCase())}`,
  );
  const activeExisting = existingUsers.find(isActiveMockUser);
  if (activeExisting) {
    throw new ServiceError(
      "EMAIL_ALREADY_EXISTS",
      409,
      "User email is already registered",
    );
  }

  const now = new Date().toISOString();
  const roleId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const serializedMatrix = serializePermissionMatrix(input.permissions);
  const newMockCodes = matrixToMockPermissions(input.permissions);

  // 1. Create Role
  await mockApi.post<MockRole>("/roles", {
    id: roleId,
    event_id: eventId,
    owner_user_id: currentUserId,
    name: input.roleName.trim() || "Sub-User Role",
    description: serializedMatrix,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  });

  // 2. Insert Role Permissions
  for (const code of newMockCodes) {
    try {
      await mockApi.post("/role_permissions", {
        role_id: roleId,
        permission: code,
      });
    } catch {
      // Mock safety
    }
  }

  // 3. Create User
  const newUser: MockUser = {
    id: userId,
    email: input.email.trim().toLowerCase(),
    password: "password123", // Default mock seed password
    display_name: input.name.trim(),
    system_role: "event_user",
    platform_role_id: null,
    event_id: eventId,
    role_id: roleId,
    role_assigned_by_user_id: currentUserId,
    role_assigned_at: now,
    status: "active", // In demo mode, activated immediately
    invited_by_user_id: currentUserId,
    joined_at: now,
    created_at: now,
    updated_at: now,
    removed_at: null,
  };

  await mockApi.post<MockUser>("/users", newUser);

  return {
    id: userId,
    name: newUser.display_name,
    email: newUser.email,
    roleId,
    customRoleName: input.roleName.trim(),
    status: newUser.status,
    joinedAt: newUser.joined_at,
    createdAt: newUser.created_at,
    permissions: input.permissions,
    rawPermissions: newMockCodes,
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

  const now = new Date().toISOString();
  await mockApi.patch<MockUser>(`/users/${subUserId}`, {
    status: "removed",
    removed_at: now,
    updated_at: now,
  });
}
