import { ServiceError } from "@/core/api/service-error";
import type { FormStatus } from "@/types/event/form";

const ALLOWED_TRANSITIONS: Record<FormStatus, readonly FormStatus[]> = {
  draft: ["pending_approval"],
  pending_approval: ["draft", "approved", "rejected"],
  approved: ["published"],
  rejected: ["draft"],
  published: ["paused", "closed"],
  paused: ["published", "closed"],
  closed: ["archived"],
  archived: [],
};

/**
 * Same-status patches are allowed so schedule/intake settings can be adjusted
 * without inventing a lifecycle transition.
 */
export function assertFormStatusTransition(
  current: FormStatus,
  next: FormStatus,
): void {
  if (current === next || ALLOWED_TRANSITIONS[current].includes(next)) return;

  throw new ServiceError(
    "INVALID_FORM_STATUS_TRANSITION",
    409,
    `Form status cannot change from ${current} to ${next}`,
  );
}

export function isApprovalDecision(
  current: FormStatus,
  next: FormStatus,
): boolean {
  return (
    current === "pending_approval" &&
    (next === "approved" || next === "rejected")
  );
}

export function resolveAcceptingResponses(
  current: FormStatus,
  next: FormStatus,
  currentValue: boolean,
  explicit?: boolean,
): boolean {
  if (explicit === true && next !== "published") {
    throw new ServiceError(
      "FORM_NOT_PUBLISHED",
      409,
      "Only a published form can accept responses",
    );
  }
  if (next !== "published") return false;
  if (explicit !== undefined) return explicit;
  if (current === "published") return currentValue;
  return true;
}
