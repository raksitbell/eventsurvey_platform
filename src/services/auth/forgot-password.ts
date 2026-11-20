import { mockApi } from "@/core/api/mock-client";
import { ServiceError } from "@/core/api/service-error";
import { PORTAL_ROLES } from "@/core/auth/constants";
import { getAuthSessionSecret } from "@/core/auth/cookie";
import { canAccessPortal } from "@/core/auth/permissions";
import { maskEmail, maskName } from "@/core/auth/pii";
import {
  passwordStamp,
  readResetPasswordToken,
} from "@/core/auth/reset-password-token";
import { sendPasswordResetEmail } from "@/core/mail/send-reset-password";
import {
  isActiveMockUser,
  mapMockUserToUser,
} from "@/core/mock/map-user";
import { getRolePermissions } from "@/core/mock/role-permissions";
import type { MockUser } from "@/types/mock";

export type ResetPasswordPreview = {
  userId: string;
  email: string;
  displayName: string;
};

async function findPortalUserByEmail(email: string): Promise<MockUser | null> {
  const params = new URLSearchParams({ email, status: "active" });
  const users = await mockApi.get<MockUser[]>(`/users?${params.toString()}`);
  const matched = users.find(
    (user) => isActiveMockUser(user) && user.email === email,
  );
  if (!matched) return null;

  const permissions = await getRolePermissions(matched.id, matched.event_id);
  const mapped = mapMockUserToUser(matched, permissions);
  if (
    !mapped ||
    !canAccessPortal(mapped.role) ||
    !PORTAL_ROLES.includes(mapped.role)
  ) {
    return null;
  }
  return matched;
}

async function getResetUser(token: string): Promise<MockUser> {
  const claims = readResetPasswordToken(token);
  if (!claims) throw new ServiceError("RESET_NOT_FOUND", 404);

  const secret = getAuthSessionSecret();
  if (!secret) throw new ServiceError("RESET_NOT_FOUND", 404);

  let user: MockUser;
  try {
    user = await mockApi.get<MockUser>(
      `/users/${encodeURIComponent(claims.userId)}`,
    );
  } catch {
    throw new ServiceError("RESET_NOT_FOUND", 404);
  }

  if (
    !user ||
    user.id !== claims.userId ||
    user.removed_at ||
    user.status !== "active" ||
    passwordStamp(user.password, secret) !== claims.pwd
  ) {
    throw new ServiceError("RESET_NOT_AVAILABLE", 410);
  }

  const permissions = await getRolePermissions(user.id, user.event_id);
  const mapped = mapMockUserToUser(user, permissions);
  if (
    !mapped ||
    !canAccessPortal(mapped.role) ||
    !PORTAL_ROLES.includes(mapped.role)
  ) {
    throw new ServiceError("RESET_NOT_AVAILABLE", 410);
  }

  return user;
}

/**
 * Always resolves successfully to avoid email enumeration.
 * Sends mail only when a matching portal account exists and SMTP is configured.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const normalized = email.trim();
  if (!normalized) return;

  let user: MockUser | null = null;
  try {
    user = await findPortalUserByEmail(normalized);
  } catch {
    return;
  }
  if (!user) return;

  try {
    await sendPasswordResetEmail({
      to: user.email,
      displayName: user.display_name,
      userId: user.id,
      password: user.password,
    });
  } catch (error) {
    // Keep the public response identical when mail is unavailable.
    if (process.env.NODE_ENV === "development") {
      console.error(
        "[forgot-password] failed to send reset mail",
        error instanceof Error ? error.message : error,
      );
    }
  }
}

export async function getResetPasswordPreview(
  token: string,
): Promise<ResetPasswordPreview> {
  const user = await getResetUser(token);
  return {
    userId: user.id,
    email: maskEmail(user.email),
    displayName: maskName(user.display_name),
  };
}

export async function resetPasswordWithToken(
  token: string,
  password: string,
): Promise<void> {
  const user = await getResetUser(token);
  const now = new Date().toISOString();
  await mockApi.patch(`/users/${encodeURIComponent(user.id)}`, {
    password,
    updated_at: now,
  });
}
