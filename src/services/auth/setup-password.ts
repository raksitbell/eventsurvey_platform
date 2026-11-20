import { mockApi } from "@/core/api/mock-client";
import { ServiceError } from "@/core/api/service-error";
import { maskEmail, maskName } from "@/core/auth/pii";
import { readSetupPasswordInvite } from "@/core/auth/setup-password-invite";
import type { MockUser } from "@/types/mock";

export type SetupPasswordPreview = {
  userId: string;
  email: string;
  displayName: string;
};

async function getInvitedUser(token: string): Promise<MockUser> {
  const userId = readSetupPasswordInvite(token);
  if (!userId) throw new ServiceError("INVITE_NOT_FOUND", 404);

  let user: MockUser;
  try {
    user = await mockApi.get<MockUser>(`/users/${encodeURIComponent(userId)}`);
  } catch {
    throw new ServiceError("INVITE_NOT_FOUND", 404);
  }

  if (
    !user || user.id !== userId || user.system_role !== "event_user" ||
    user.removed_at || user.status !== "invited"
  ) {
    throw new ServiceError("INVITE_NOT_AVAILABLE", 410);
  }

  return user;
}

export async function getSetupPasswordPreview(
  token: string,
): Promise<SetupPasswordPreview> {
  const user = await getInvitedUser(token);
  return {
    userId: user.id,
    email: maskEmail(user.email),
    displayName: maskName(user.display_name),
  };
}

export async function setPasswordForInvitedUser(
  token: string,
  password: string,
): Promise<void> {
  const user = await getInvitedUser(token);
  const now = new Date().toISOString();
  await mockApi.patch(`/users/${encodeURIComponent(user.id)}`, {
    password,
    uses_published_trial_password: false,
    status: "active",
    joined_at: now,
    updated_at: now,
  });
}
