import { mockApi } from "@/core/api/mock-client";
import { ServiceError } from "@/core/api/service-error";
import type { MockUser } from "@/types/mock";

export type SetupPasswordPreview = {
  userId: string;
  email: string;
  displayName: string;
};

export async function getSetupPasswordPreview(
  userId: string,
): Promise<SetupPasswordPreview> {
  let user: MockUser;
  try {
    user = await mockApi.get<MockUser>(`/users/${userId}`);
  } catch {
    throw new ServiceError("INVITE_NOT_FOUND", 404);
  }

  if (!user || user.removed_at || user.status !== "invited") {
    throw new ServiceError("INVITE_NOT_AVAILABLE", 410);
  }

  return {
    userId: user.id,
    email: user.email,
    displayName: user.display_name,
  };
}

export async function setPasswordForInvitedUser(
  userId: string,
  password: string,
): Promise<void> {
  let user: MockUser;
  try {
    user = await mockApi.get<MockUser>(`/users/${userId}`);
  } catch {
    throw new ServiceError("INVITE_NOT_FOUND", 404);
  }

  if (!user || user.removed_at || user.status !== "invited") {
    throw new ServiceError("INVITE_NOT_AVAILABLE", 410);
  }

  const now = new Date().toISOString();
  await mockApi.patch(`/users/${userId}`, {
    password,
    status: "active",
    joined_at: now,
    updated_at: now,
  });
}
