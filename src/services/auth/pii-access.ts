import type { PiiViewer } from "@/core/auth/pii";
import { hasPlatformPermission } from "@/core/mock/role-permissions";

export async function getPlatformPiiViewer(session: {
  userId: string;
  platformRoleId: string | null;
}): Promise<PiiViewer> {
  return {
    userId: session.userId,
    canViewUnmaskedPii: await hasPlatformPermission(
      session.platformRoleId,
      "view_unmasked_pii",
    ).catch(() => false),
  };
}
