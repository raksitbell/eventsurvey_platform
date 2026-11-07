import { ServiceError } from "@/core/api/service-error";
import type { FormStatus } from "@/types/event/form";
import type { MockEvent, MockForm } from "@/types/mock";

const ALLOWED_TRANSITIONS: Record<FormStatus, readonly FormStatus[]> = {
  draft: ["scheduled", "open"],
  scheduled: ["draft", "open", "closed"],
  open: ["closed"],
  closed: [],
};

/**
 * Same-status patches are allowed so schedule windows can be adjusted
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

export function formMutationFlags(status: FormStatus): {
  canEdit: boolean;
  canDelete: boolean;
  canChangeStatus: boolean;
} {
  if (status === "closed") {
    return { canEdit: false, canDelete: false, canChangeStatus: false };
  }
  if (status === "open") {
    return { canEdit: false, canDelete: false, canChangeStatus: true };
  }
  // draft | scheduled
  return { canEdit: true, canDelete: true, canChangeStatus: true };
}

function parseTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Resolve the effective form status for API responses.
 *
 * - `draft` / `closed` stored statuses are respected.
 * - With `opens_at` / `closes_at`, time windows drive scheduled → open → closed.
 * - Without a form schedule, inherit open/closed from the parent event.
 */
export function resolveEffectiveFormStatus(
  form: Pick<MockForm, "status" | "opens_at" | "closes_at">,
  event: Pick<MockEvent, "status" | "start_at" | "end_at" | "opens_at" | "closes_at">,
  nowMs: number = Date.now(),
): FormStatus {
  if (form.status === "draft") return "draft";
  if (form.status === "closed") return "closed";

  const formOpens = parseTime(form.opens_at);
  const formCloses = parseTime(form.closes_at);
  const hasFormSchedule = formOpens !== null || formCloses !== null;

  if (hasFormSchedule) {
    if (formCloses !== null && nowMs >= formCloses) return "closed";
    if (formOpens !== null && nowMs < formOpens) return "scheduled";
    if (formOpens !== null && nowMs >= formOpens) return "open";
    // only closes_at set and not yet reached → scheduled until close
    return "scheduled";
  }

  // No form-level schedule — inherit from event timing / status
  if (event.status === "closed") return "closed";
  if (event.status === "open") return "open";

  const eventOpens =
    parseTime(event.opens_at) ?? parseTime(event.start_at);
  const eventCloses =
    parseTime(event.closes_at) ?? parseTime(event.end_at);

  if (eventCloses !== null && nowMs >= eventCloses) return "closed";
  if (eventOpens !== null && nowMs >= eventOpens) return "open";
  if (eventOpens !== null && nowMs < eventOpens) return "scheduled";

  // Event still draft/scheduled without usable times
  return form.status === "open" ? "open" : "scheduled";
}

/** Status to persist when saving a builder payload with optional schedule. */
export function statusFromScheduleInput(
  opensAt: string | null | undefined,
  closesAt: string | null | undefined,
  current: FormStatus = "draft",
): FormStatus {
  if (current === "open" || current === "closed") return current;
  const hasSchedule = Boolean(opensAt?.trim()) || Boolean(closesAt?.trim());
  return hasSchedule ? "scheduled" : "draft";
}
