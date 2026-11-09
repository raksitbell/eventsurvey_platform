import { ServiceError } from "@/core/api/service-error";
import type { FormStatus } from "@/types/event/form";
import type { MockEvent, MockForm } from "@/types/mock";

/** Manual status API: draft ↔ scheduled only. open/closed come from cron. */
const MANUAL_TRANSITIONS: Record<FormStatus, readonly FormStatus[]> = {
  draft: ["scheduled"],
  scheduled: ["draft"],
  open: [],
  closed: [],
};

/**
 * Same-status patches are allowed so schedule windows can be adjusted
 * while staying on `scheduled` (without inventing a lifecycle transition).
 */
export function assertManualFormStatusTransition(
  current: FormStatus,
  next: FormStatus,
): void {
  if (next === "open" || next === "closed") {
    throw new ServiceError(
      "FORM_STATUS_CRON_ONLY",
      409,
      "open and closed statuses are updated by the forms cron job only",
    );
  }

  if (current === next || MANUAL_TRANSITIONS[current].includes(next)) return;

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
  if (status === "draft") {
    return { canEdit: true, canDelete: true, canChangeStatus: true };
  }
  if (status === "scheduled") {
    // Revert to draft only — content is locked until back in draft
    return { canEdit: false, canDelete: false, canChangeStatus: true };
  }
  // open | closed — cron owns further transitions
  return { canEdit: false, canDelete: false, canChangeStatus: false };
}

function parseTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Stored status is the source of truth.
 * Time-based open/closed promotion is persisted by the forms cron job.
 */
export function resolveEffectiveFormStatus(
  form: Pick<MockForm, "status">,
): FormStatus {
  return form.status;
}

export function resolveFormWindows(
  form: Pick<MockForm, "opens_at" | "closes_at">,
  event: Pick<
    MockEvent,
    "opens_at" | "closes_at" | "start_at" | "end_at" | "status"
  >,
): { opensAt: number | null; closesAt: number | null } {
  const formOpens = parseTime(form.opens_at);
  const formCloses = parseTime(form.closes_at);
  const hasFormSchedule = formOpens !== null || formCloses !== null;

  if (hasFormSchedule) {
    return { opensAt: formOpens, closesAt: formCloses };
  }

  return {
    opensAt: parseTime(event.opens_at) ?? parseTime(event.start_at),
    closesAt: parseTime(event.closes_at) ?? parseTime(event.end_at),
  };
}

/**
 * Next persisted status for cron, based on schedule windows / event status.
 * Returns null when no change is needed.
 */
export function nextCronFormStatus(
  form: Pick<MockForm, "status" | "opens_at" | "closes_at">,
  event: Pick<
    MockEvent,
    "status" | "opens_at" | "closes_at" | "start_at" | "end_at"
  >,
  nowMs: number = Date.now(),
): FormStatus | null {
  if (form.status === "draft" || form.status === "closed") return null;

  const { opensAt, closesAt } = resolveFormWindows(form, event);
  const eventClosed = event.status === "closed";

  if (form.status === "scheduled") {
    if (eventClosed) return "closed";
    if (closesAt !== null && nowMs >= closesAt) return "closed";
    if (opensAt !== null && nowMs >= opensAt) return "open";
    return null;
  }

  // open
  if (eventClosed) return "closed";
  if (closesAt !== null && nowMs >= closesAt) return "closed";
  return null;
}
