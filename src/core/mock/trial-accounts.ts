import type { MockUser } from "@/types/mock";

const PUBLISHED_TRIAL_EMAILS = new Set([
  "admin@example.com",
  "thanawat@example.com",
  "kittisak@example.com",
]);

export function isPublishedTrialEmail(email: string): boolean {
  return PUBLISHED_TRIAL_EMAILS.has(email.trim().toLowerCase());
}

export function isTrialAccount(user: MockUser): boolean {
  return user.is_trial ?? isPublishedTrialEmail(user.email ?? "");
}
