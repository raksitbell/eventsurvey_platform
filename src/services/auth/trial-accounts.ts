import { mockApi } from "@/core/api/mock-client";
import { PORTAL_ROLES } from "@/core/auth/constants";
import { PUBLISHED_DEMO_PASSWORD } from "@/core/auth/demo-preset";
import { isActiveMockUser, resolveAppRole } from "@/core/mock/map-user";
import { isPublishedTrialEmail, isTrialAccount } from "@/core/mock/trial-accounts";
import type { LoginTrialAccount } from "@/types/auth";
import type { MockEvent, MockEventAccess, MockUser } from "@/types/mock";
import { isPublicDemoLoginBlocked } from "./public-demo";

export async function listLoginTrialAccounts(): Promise<LoginTrialAccount[]> {
  const [users, events, accessRows] = await Promise.all([
    mockApi.getFresh<MockUser[]>("/users?status=active"),
    mockApi.getFresh<MockEvent[]>("/events"),
    mockApi.getFresh<MockEventAccess[]>("/event_access"),
  ]);
  const liveEvents = new Set(
    events.filter((event) => !event.deleted_at).map((event) => event.id),
  );
  const accounts: LoginTrialAccount[] = [];

  for (const user of users) {
    if (!isActiveMockUser(user) || !isTrialAccount(user) || isPublicDemoLoginBlocked(user)) continue;
    // The sign-in handler trims submitted emails and compares them to the stored value.
    if (!user.email || user.email !== user.email.trim() || !user.password)
      continue;
    if (
      user.system_role === "event_user" &&
      (!user.event_id || !liveEvents.has(user.event_id))
    )
      continue;
    const access = accessRows.find(
      (row) =>
        row.user_id === user.id &&
        row.event_id === user.event_id &&
        !row.deleted_at,
    );
    const role = resolveAppRole(
      user,
      access?.can_manage_sub_users ? ["manage_sub_user"] : [],
    );
    if (!role || role === "participant") continue;
    const account: LoginTrialAccount = { email: user.email, role };
    const published = user.uses_published_trial_password ?? isPublishedTrialEmail(user.email);
    if (published && user.password === PUBLISHED_DEMO_PASSWORD) {
      account.usesPublishedPassword = true;
    }
    accounts.push(account);
  }
  return accounts.sort(
    (a, b) =>
      PORTAL_ROLES.indexOf(a.role) - PORTAL_ROLES.indexOf(b.role) ||
      a.email.localeCompare(b.email),
  );
}
