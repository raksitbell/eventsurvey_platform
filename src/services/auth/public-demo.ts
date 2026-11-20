import { MOCK_API_BASE_URL, PUBLIC_DEMO_API_BASE_URL } from "@/core/api/mock-client";
import { PUBLISHED_DEMO_PASSWORD } from "@/core/auth/demo-preset";
import type { MockUser } from "@/types/mock";

export function canCreatePublicDemoTrial(): boolean {
  const configuredDemoUrl = process.env.TRIAL_DEMO_API_BASE_URL?.replace(/\/+$/, "");
  return Boolean(MOCK_API_BASE_URL) &&
    (MOCK_API_BASE_URL === PUBLIC_DEMO_API_BASE_URL || MOCK_API_BASE_URL === configuredDemoUrl);
}

/** A provisioned demo credential is valid only while its account and backend are designated for trials. */
export function isPublicDemoLoginBlocked(user: MockUser): boolean {
  return (user.uses_published_trial_password ?? false) &&
    user.password === PUBLISHED_DEMO_PASSWORD &&
    (!user.is_trial || !canCreatePublicDemoTrial());
}
