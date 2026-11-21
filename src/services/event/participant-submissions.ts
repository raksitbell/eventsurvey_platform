import { createHash, createHmac, randomInt } from "node:crypto";
import { mockApi } from "@/core/api/mock-client";
import { ServiceError } from "@/core/api/service-error";
import {
  answerChoicesWithIds, preparePublicFormAnswers, publicQuestionId,
} from "@/core/event/public-form-response";
import { writeSerially } from "@/core/event/serial-write";
import type { SetupRecord } from "@/core/event/setup-state";
import { readSetupRecord } from "@/core/event/setup-storage";
import { normalizeWhitelistId } from "@/core/event/whitelist";
import { completeFormLocale } from "@/core/forms/content";
import { activeSubmission } from "@/core/forms/lifecycle";
import { supportsUniqueField } from "@/core/forms/unique-field";
import type { Form, FormLocale } from "@/types/event/form";
import type { ParticipantFormKind } from "@/types/event/participant";
import type { PublicFormSubmissionInput, PublicFormSubmissionResult, RegistrationProof } from "@/types/event/public-event";
import type { MockEvent, MockFieldOption, MockFormField, MockFormSubmission as Submission, MockParticipantPendingWrite as Pending, MockSubmissionAnswer, MockWhitelistEntry } from "@/types/mock";
import { currentPublicFormId, findPublicEvent, resolvePublicForm, verifiedRegistration } from "./public-event";

type PreparedAnswer = Extract<ReturnType<typeof preparePublicFormAnswers>, { ok: true }>["answers"][number];
type Success = { status: "submitted"; registration?: RegistrationProof; receiptExpiresAt?: string | null };
type Result = Exclude<PublicFormSubmissionResult, { status: "submitted" }> | Success;
const invalid: Result = { status: "invalid", errors: {} };

function digest(...values: (string | number)[]) {
  return createHash("sha256").update(JSON.stringify(values)).digest("hex");
}

function requestFingerprint(input: PublicFormSubmissionInput, proofId?: string) {
  const answers = input.answers;
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) return null;
  const values = Object.keys(answers).sort().map((field) => {
    const value: unknown = (answers as Record<string, unknown>)[field];
    if (typeof value === "string" || typeof value === "number") return [field, value];
    if (Array.isArray(value) && value.every((item) => typeof item === "string")) return [field, [...value].sort()];
    return null;
  });
  if (values.some((entry) => entry === null)) return null;
  return digest("participant-payload", input.requestId, input.locale, input.identifier?.trim() ?? "", proofId ?? "", JSON.stringify(values));
}

function privateValueHash(formId: string, fieldId: string, value: string) {
  const secret = process.env.EVENT_SETUP_DATA_SECRET || process.env.AUTH_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new ServiceError("SUBMISSION_STORAGE_UNAVAILABLE", 503);
  return createHmac("sha256", secret).update(JSON.stringify(["participant-unique", formId, fieldId, value])).digest("hex");
}

// JSON Server has one primary key per collection. Competing writes use the same
// form/sequence key so a successful insert serializes capacity and duplicate checks.
function recordId(...values: (string | number)[]) {
  const hex = digest(...values);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-8${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

async function rowById<T extends { id: string }>(collection: string, id: string) {
  const rows = await mockApi.getFresh<T[]>(`/${collection}?id=${encodeURIComponent(id)}`);
  return rows.find((row) => row.id === id);
}

async function insertOrFind<T extends { id: string }>(collection: string, body: T): Promise<T> {
  try {
    const row = await mockApi.post<T>("/" + collection, body);
    if (row?.id === body.id) return row;
  } catch (error) {
    // Includes a duplicate primary key or a lost response after a committed POST.
    const stored = await rowById<T>(collection, body.id);
    if (stored) return stored;
    throw error;
  }
  throw new ServiceError("SUBMISSION_STORAGE_UNAVAILABLE", 503);
}

async function insertChild<T extends { id: string }>(collection: string, body: T) {
  const row = await rowById<T>(collection, body.id) ?? await insertOrFind(collection, body);
  if (Object.entries(body).some(([key, value]) => row[key as keyof T] !== value)) {
    throw new ServiceError("SUBMISSION_STORAGE_CONFLICT", 503);
  }
}

async function markJoined(entry: NonNullable<Pending["whitelist"]>, row: Submission) {
  const existing = await rowById<MockWhitelistEntry>("whitelist_entries", entry.id);
  if (existing) {
    if (existing.event_id !== row.event_id || existing.deleted_at ||
      normalizeWhitelistId(existing.access_code, entry.fieldType) !== entry.uniqueId) throw new ServiceError("SUBMISSION_STORAGE_CONFLICT", 503);
    if (existing.status === "joined" && existing.participant_submission_id === row.id) return;
    if (existing.status === "joined") {
      const previous = existing.participant_submission_id && await rowById<Submission>("form_submissions", existing.participant_submission_id);
      if (!existing.participant_submission_id || (previous && !previous.deleted_at && !previous.cancelled_at &&
          (activeSubmission(previous) || previous.status === "pending"))) throw new ServiceError("SUBMISSION_STORAGE_CONFLICT", 503);
    }
    const saved = await mockApi.patch<MockWhitelistEntry>(`/whitelist_entries/${encodeURIComponent(entry.id)}`, {
      status: "joined", joined_at: row.submitted_at, participant_submission_id: row.id,
    });
    if (saved?.id !== entry.id || saved.status !== "joined" || saved.participant_submission_id !== row.id) {
      throw new ServiceError("SUBMISSION_STORAGE_UNAVAILABLE", 503);
    }
    return;
  }
  await insertChild("whitelist_entries", {
    id: entry.id, event_id: row.event_id, access_code: entry.uniqueId, username: entry.name, status: "joined",
    joined_at: row.submitted_at, created_at: row.submitted_at, deleted_at: null, participant_submission_id: row.id,
  });
}

// A pending parent contains everything required to finish a partially accepted
// write. Reports and receipts only observe the submitted state after all children exist.
async function completePending(row: Submission) {
  const latest = await rowById<Submission>("form_submissions", row.id);
  if (!latest || latest.participant_request !== row.participant_request) throw new ServiceError("SUBMISSION_STORAGE_CONFLICT", 503);
  if (latest.status !== "pending" || latest.cancelled_at || latest.deleted_at) return latest;
  const pending = latest.pending_write;
  if (!pending || !latest.event_id || !latest.participant_sequence ||
      latest.id !== recordId("submission", latest.event_id, latest.form_id, latest.participant_sequence)) throw new ServiceError("SUBMISSION_STORAGE_CONFLICT", 503);
  for (const { optionIds, ...answer } of pending.answers) {
    const id = recordId("answer", row.id, answer.field_id);
    await insertChild("submission_answers", {
      id, submission_id: row.id, ...answer, created_at: row.submitted_at,
    });
    for (const optionId of optionIds) {
      await insertChild("answer_option_selections", {
        id: recordId("selection", id, optionId), answer_id: id, option_id: optionId,
      });
    }
  }
  if (pending.confirmationCode) {
    if (pending.whitelist) await markJoined(pending.whitelist, row);
    await insertChild("registrations", {
      id: row.id, submission_id: row.id, whitelist_entry_id: pending.whitelist?.id ?? null,
      confirmation_code: pending.confirmationCode,
    });
  }
  const current = await rowById<Submission>("form_submissions", row.id);
  if (!current || current.participant_request !== row.participant_request) throw new ServiceError("SUBMISSION_STORAGE_CONFLICT", 503);
  if (current.status !== "pending" || current.cancelled_at || current.deleted_at) return current;
  const saved = await mockApi.patch<Submission>(`/form_submissions/${encodeURIComponent(row.id)}`, {
    status: "submitted", pending_write: null,
  });
  if (saved?.id !== row.id || !activeSubmission(saved)) throw new ServiceError("SUBMISSION_STORAGE_UNAVAILABLE", 503);
  return saved;
}

function success(row: Submission): Success {
  if (row.participant_kind !== "registration" || !row.event_id) return { status: "submitted" };
  return {
    status: "submitted",
    registration: { eventId: row.event_id, registrationFormId: row.form_id, submissionId: row.id },
    receiptExpiresAt: row.receipt_expires_at,
  };
}

// Legacy snapshots use display orders when a field or option ID was absent.
// Resolve these only against the owning form/field, never write synthetic reporting IDs.
async function bindStoredIds(formId: string, form: Form, answers: PreparedAnswer[], locale: FormLocale) {
  let fields: MockFormField[] | undefined;
  for (const answer of answers) {
    const { question } = form.questions.find(({ question }) => publicQuestionId(question) === answer.field_id)!;
    if (!question.id) {
      fields ??= await mockApi.getFresh<MockFormField[]>(`/form_fields?form_id=${encodeURIComponent(formId)}`);
      const matches = fields.filter((row) => row.form_id === formId && row.display_order === question.display_order &&
        row.type === question.type && !row.deleted_at);
      if (matches.length !== 1) throw new ServiceError("SUBMISSION_FIELD_UNAVAILABLE", 409);
      answer.field_id = matches[0].id;
    }
    if (!answer.optionIds.length) continue;
    const choices = question.label[locale][0]?.choices[locale] ?? [];
    if (choices.every((choice) => choice.id)) continue;
    const projected = answerChoicesWithIds(choices);
    const options = await mockApi.getFresh<MockFieldOption[]>(`/field_options?field_id=${encodeURIComponent(answer.field_id)}`);
    answer.optionIds = answer.optionIds.map((id) => {
      const choice = choices[projected.findIndex((item) => item.id === id)];
      if (choice.id) return choice.id;
      const matches = options.filter((row) => row.field_id === answer.field_id && !row.deleted_at && row.display_order === choice.display_order);
      if (matches.length !== 1) throw new ServiceError("SUBMISSION_FIELD_UNAVAILABLE", 409);
      return matches[0].id;
    });
  }
}

async function acceptedResult(event: MockEvent, setup: SetupRecord, row: Submission): Promise<Result> {
  if (!row.participant_kind || row.event_id !== event.id) return { status: "unavailable" };
  if (row.form_id !== await currentPublicFormId(event, setup, row.participant_kind, mockApi.getFresh)) return { status: "unavailable" };
  if (!row.cancelled_at && !row.deleted_at && row.status === "pending") row = await completePending(row);
  if (!activeSubmission(row)) return { status: "duplicate" };
  const result = success(row);
  if (result.registration) {
    if (!await verifiedRegistration(event, setup, result.registration)) return { status: "duplicate" };
  }
  return result;
}

async function requestRow(event: MockEvent, kind: ParticipantFormKind, request: string) {
  const rows = await mockApi.getFresh<Submission[]>(`/form_submissions?participant_request=${request}`);
  return rows.find((row) => row.participant_request === request && row.event_id === event.id && row.participant_kind === kind);
}

export async function recoverPublicSubmission(slug: string, kind: ParticipantFormKind, requestKey: string): Promise<Result | null> {
  if (!/^[a-f0-9]{64}$/.test(requestKey)) return null;
  const initial = await findPublicEvent(slug, mockApi.getFresh);
  if (!initial) return null;
  return writeSerially(initial.id, async () => {
    const event = await findPublicEvent(slug, mockApi.getFresh);
    if (!event || event.id !== initial.id) return null;
    const row = await requestRow(event, kind, digest("submission-request", requestKey));
    if (!row) return null;
    const setup = readSetupRecord(event);
    return acceptedResult(event, setup, row);
  });
}

export async function submitPublicForm(
  slug: string, kind: ParticipantFormKind, input: PublicFormSubmissionInput, proof?: RegistrationProof | null,
): Promise<Result> {
  if (!/^[a-f0-9]{64}$/.test(input.requestId)) return invalid;
  const initial = await findPublicEvent(slug, mockApi.getFresh);
  if (!initial) return { status: "unavailable" };
  const request = digest("submission-request", input.requestId);
  return writeSerially(initial.id, async () => {
    const event = await findPublicEvent(slug, mockApi.getFresh);
    if (!event || event.id !== initial.id) return { status: "unavailable" };
    const setup = readSetupRecord(event);
    const requiresRegistration = kind === "survey" &&
      (setup.publication ? setup.publication.draft.surveyAccess : event.survey_access) === "registered_only";
    const fingerprint = requestFingerprint(input, requiresRegistration ? proof?.submissionId : undefined);
    if (!fingerprint) return invalid;
    const replay = (row: Submission): Promise<Result> | Result =>
      row.participant_fingerprint === fingerprint ? acceptedResult(event, setup, row) : { status: "requestChanged" };
    const previous = await requestRow(event, kind, request);
    if (previous) return replay(previous);

    for (let attempt = 0; attempt < 16; attempt++) {
      const access = await resolvePublicForm(event, kind, setup, input.identifier, proof, mockApi.getFresh);
      if (!access) return { status: "unavailable" };
      if (access.status !== "open") return access;
      const { form, formId, registrationId, whitelist, capacity } = access;
      const locale = completeFormLocale(form, input.locale) ?? input.locale;
      const checked = preparePublicFormAnswers(form, input.answers, locale);
      if (!checked.ok) return { status: "invalid", errors: checked.fieldId ? { [checked.fieldId]: checked.issue } : {} };
      const unique = form.questions.find(({ question }) => question.is_unique)?.question;
      const answer = unique && checked.answers.find((answer) => answer.field_id === publicQuestionId(unique));
      const identifier = unique && supportsUniqueField(unique.type) && answer
        ? normalizeWhitelistId(String(answer.value_text ?? answer.value_number ?? ""), unique.type) : undefined;
      if (whitelist && (!unique || unique.id !== whitelist.fieldId || identifier !== whitelist.uniqueId)) {
        return { status: "invalid", errors: { [whitelist.fieldId]: { key: "invalidAnswer" } } };
      }
      await bindStoredIds(formId, form, checked.answers, locale);
      const uniqueHash = identifier && answer ? privateValueHash(formId, answer.field_id, identifier) : undefined;
      const rows = (await mockApi.getFresh<Submission[]>(`/form_submissions?form_id=${encodeURIComponent(formId)}`))
        .filter((row) => row.form_id === formId);
      const pending = rows.find((row) => row.status === "pending" && !row.deleted_at && !row.cancelled_at && row.pending_write && row.event_id === event.id);
      if (pending) {
        if (pending.participant_request === request) return replay(pending);
        await completePending(pending);
        continue;
      }
      const existing = rows.find((row) => row.participant_request === request);
      if (existing) return replay(existing);
      const committed = rows.filter(activeSubmission);
      if (capacity != null && committed.length >= capacity) return { status: "full" };
      if (committed.some((row) => (registrationId && row.registration_submission_id === registrationId) ||
        (uniqueHash && row.participant_unique === uniqueHash))) return { status: "duplicate" };
      if (identifier && unique && supportsUniqueField(unique.type) && answer) {
        const older = new Set(committed.filter((row) => !row.participant_request).map((row) => row.id));
        if (older.size) {
          const kind = unique.type;
          const answers = await mockApi.getFresh<MockSubmissionAnswer[]>(`/submission_answers?field_id=${encodeURIComponent(answer.field_id)}`);
          if (answers.some((row) => row.field_id === answer.field_id && older.has(row.submission_id) &&
            normalizeWhitelistId(String(row.value_text ?? row.value_number ?? ""), kind) === identifier)) return { status: "duplicate" };
        }
      }
      const sequence = rows.reduce((max, row) => Math.max(max, row.participant_sequence ?? 0), 0) + 1;
      const row = await insertOrFind<Submission>("form_submissions", {
        id: recordId("submission", event.id, formId, sequence),
        event_id: event.id, form_id: formId, status: "pending", submitted_at: new Date().toISOString(),
        cancelled_at: null, cancelled_by_user_id: null, submitted_language: locale,
        participant_kind: kind, participant_request: request, participant_sequence: sequence,
        participant_fingerprint: fingerprint, participant_unique: uniqueHash, registration_submission_id: registrationId,
        receipt_expires_at: kind === "registration" ? access.receiptClosesAt ??
          new Date(Date.now() + 365 * 86_400_000).toISOString() : undefined,
        pending_write: { answers: checked.answers, whitelist, confirmationCode: kind === "registration" ? String(randomInt(1_000_000)).padStart(6, "0") : undefined },
      });
      if (row.participant_request === request) return replay(row);
    }
    throw new ServiceError("SUBMISSION_BUSY", 503);
  });
}
