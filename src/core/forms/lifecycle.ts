import { ServiceError } from "@/core/api/service-error";
import type { FormStatus } from "@/types/event/form";
import type { MockEvent, MockForm, MockFormSubmission } from "@/types/mock";

export function activeSubmission(row: MockFormSubmission) {
  return row.status === "submitted" && !row.cancelled_at && !row.deleted_at;
}

/** Manual status API: draft ↔ scheduled only. open/closed come from cron. */
const MANUAL_TRANSITIONS: Record<FormStatus, readonly FormStatus[]> = {
  draft: ["scheduled"],
  scheduled: ["draft"],
  open: [],
  closed: [],
  pending_approval: [],
  approved: [],
  rejected: [],
  published: [],
  paused: [],
  archived: [],
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
  // All other states are locked to manual edits.
  return { canEdit: false, canDelete: false, canChangeStatus: false };
}

function parseTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

/** Registration closes with the event even if the form has a later closing time. */
export function registrationOutsideEvent(
  endsAt: string | null,
  opensAt: string | null,
  closesAt: string | null,
  now = Date.now(),
): boolean {
  const end = parseTime(endsAt);
  if (end === null) return false;
  const opening = parseTime(opensAt);
  const closing = parseTime(closesAt);
  return now >= end || (opening !== null && opening >= end) || (closing !== null && closing > end);
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
  form: Pick<MockForm, "type" | "status" | "opens_at" | "closes_at">,
  event: Pick<
    MockEvent,
    "status" | "opens_at" | "closes_at" | "start_at" | "end_at"
  >,
  nowMs: number = Date.now(),
): FormStatus | null {
  if (
    form.status !== "scheduled" &&
    form.status !== "open" &&
    form.status !== "published"
  ) {
    return null;
  }

  const { opensAt, closesAt } = resolveFormWindows(form, event);
  const explicitClose = parseTime(form.closes_at);
  const postSurvey =
    form.type === "survey" && explicitClose !== null && nowMs < explicitClose;
  const registrationEnd = form.type === "registration" ? parseTime(event.end_at) : null;
  if (
    (event.status === "closed" && !postSurvey) ||
    (registrationEnd !== null && nowMs >= registrationEnd) ||
    (closesAt !== null && nowMs >= closesAt)
  ) {
    return "closed";
  }

  return form.status === "scheduled" && opensAt !== null && nowMs >= opensAt ? "open" : null;
}
