import { isDeepStrictEqual } from "node:util";
import { MockApiError, mockApi } from "@/core/api/mock-client";
import { ServiceError } from "@/core/api/service-error";
import { writeAuditLog } from "@/core/audit/write";
import { defaultEventBranding } from "@/core/event/branding";
import { projectEventContent } from "@/core/event/content";
import { requiredEventDetail } from "@/core/event/draft";
import { formForPublication, publicationSchema, type PublicationForm, type PublicationForms } from "@/core/event/publication";
import { invalidCustomSurveyClose, isPastScheduleMinute, surveyClosingTime } from "@/core/event/schedule";
import { writeSerially } from "@/core/event/serial-write";
import type { SetupRecord } from "@/core/event/setup-state";
import { encodeSetupRecord, readSetupRecord, readSetupState } from "@/core/event/setup-storage";
import { isEventSetupMediaUrl } from "@/core/event/setup-media-url";
import { boundWhitelistAccess, normalizeWhitelistId, parseWhitelistEntries, whitelistUniqueField } from "@/core/event/whitelist";
import { activeSubmission } from "@/core/forms/lifecycle";
import { routing, type Locale } from "@/i18n/routing";
import { getForm, listForms } from "@/services/event/forms";
import { assertEventSetupMedia } from "@/services/event/setup-media";
import { getEventWorkspace } from "@/services/event/workspace";
import type { EventBranding } from "@/types/event/branding";
import type { FormType } from "@/types/event/form";
import type { EventDraft, EventSetupMediaKind, EventSetupState } from "@/types/event/setup";
import type { WhitelistEntry, WhitelistUniqueField } from "@/types/event/whitelist";
import type { MockEvent, MockForm, MockFormSubmission, MockWhitelistEntry } from "@/types/mock";

type SetupContext = Awaited<ReturnType<typeof getSetupContext>>;
type BrandingChange = { locale: string; value: EventBranding; pendingMedia?: EventSetupMediaKind[] };

async function loadSetupEvent(eventId: string): Promise<MockEvent> {
  const event = await mockApi.get<MockEvent>(`/events/${encodeURIComponent(eventId)}`).catch((error: unknown) => {
    if (error instanceof MockApiError && error.status === 404) return null;
    throw error;
  });
  if (!event || event.id !== eventId || event.deleted_at) {
    throw new ServiceError("EVENT_NOT_FOUND", 404);
  }
  return event;
}

export async function getSetupContext(
  userId: string,
  locale: Locale = routing.defaultLocale,
  options: { inspectedEventId?: string | null } = {},
) {
  const workspace = await getEventWorkspace(userId, locale, options);
  if (!workspace) throw new ServiceError("EVENT_NOT_FOUND", 404);
  const event = await loadSetupEvent(workspace.eventId);
  return { event, workspace, userId };
}

export { readSetupState };

function editable(event: MockEvent, setup: SetupRecord) {
  if (event.status !== "draft" || setup.publication) {
    throw new ServiceError("SETUP_READ_ONLY", 409);
  }
}

function assertRevision(setup: SetupRecord, revision: number) {
  if (setup.revision !== revision) throw new ServiceError("SETUP_CONFLICT", 409);
}

function assertCanManageEvent(context: SetupContext) {
  if (!context.workspace.canEditEvent) {
    if (context.event.status !== "draft") throw new ServiceError("SETUP_READ_ONLY", 409);
    throw new ServiceError("FORBIDDEN", 403);
  }
}

async function persistSetup(event: MockEvent, setup: SetupRecord, fields?: Partial<MockEvent>) {
  const encrypted = encodeSetupRecord(event.id, setup);
  const saved = await mockApi.patch<MockEvent>(`/events/${encodeURIComponent(event.id)}`, {
    ...fields,
    setup: encrypted,
  });
  if (saved?.id !== event.id || saved.setup !== encrypted || (fields?.status && saved.status !== fields.status)) {
    throw new ServiceError("SETUP_STORAGE_UNAVAILABLE", 503);
  }
  return saved;
}

function mediaUrls(branding: EventBranding) {
  return [branding.logo?.url, branding.banner?.url, branding.wordmark?.url].filter(
    (url): url is string => typeof url === "string",
  );
}

async function checkBranding(eventId: string, branding: EventBranding) {
  const urls = mediaUrls(branding);
  if (urls.some((url) => !isEventSetupMediaUrl(url))) {
    throw new ServiceError("INVALID_SETUP_MEDIA", 400);
  }
  if (urls.length) await assertEventSetupMedia(eventId, urls);
}

function canonicalDraft(draft: EventDraft) {
  return JSON.parse(JSON.stringify(projectEventContent(draft, draft.content?.defaultLocale))) as EventDraft;
}

function sameDateTime(a: string | null | undefined, b: string | null | undefined) {
  return a === b || (!a && !b) || (!!a && !!b && Date.parse(a) === Date.parse(b));
}

function assertDraftSchedule(draft: EventDraft, previous: EventDraft | null, event: MockEvent) {
  const startsChanged = !sameDateTime(draft.startsAt, previous ? previous.startsAt : event.start_at);
  const endsChanged = !sameDateTime(draft.endsAt, previous ? previous.endsAt : event.end_at);
  const usesCustomClose = draft.hasSurvey && draft.surveyCloseMode === "custom";
  const previouslyUsedCustomClose = previous?.hasSurvey && previous.surveyCloseMode === "custom";
  const closeChanged = !sameDateTime(draft.surveyCustomClose, previous?.surveyCustomClose) ||
    (usesCustomClose && !previouslyUsedCustomClose);

  const now = Date.now();
  if (
    (startsChanged && isPastScheduleMinute(draft.startsAt, now)) ||
    (endsChanged && isPastScheduleMinute(draft.endsAt, now)) ||
    (closeChanged && isPastScheduleMinute(draft.surveyCustomClose, now))
  ) {
    throw new ServiceError("SETUP_DATE_IN_PAST", 422);
  }
  if (
    (startsChanged || endsChanged) && draft.startsAt && draft.endsAt &&
    Date.parse(draft.endsAt) <= Date.parse(draft.startsAt)
  ) {
    throw new ServiceError("SETUP_DATE_ORDER", 422);
  }
  if ((endsChanged || closeChanged) && invalidCustomSurveyClose(draft)) {
    throw new ServiceError("SETUP_SURVEY_CLOSE_INVALID", 422);
  }
}

export async function saveSetupDraft(
  context: SetupContext,
  input: { revision: number; draft?: EventDraft; branding?: BrandingChange },
): Promise<EventSetupState & { savedFromRevision?: number }> {
  assertCanManageEvent(context);
  return writeSerially(context.event.id, async () => {
    const event = await loadSetupEvent(context.event.id);
    const setup = readSetupRecord(event);
    editable(event, setup);
    const next = { ...setup };
    if (input.draft) next.draft = canonicalDraft(input.draft);
    if (input.branding) {
      const { locale, value, pendingMedia = [] } = input.branding;
      await checkBranding(event.id, value);
      next.branding = { ...setup.branding, [locale]: value };
      next.pendingMedia = { ...setup.pendingMedia, [locale]: [...new Set(pendingMedia)] };
    }
    if (isDeepStrictEqual(next, setup)) return readSetupState(event);
    assertRevision(setup, input.revision);
    if (input.draft) assertDraftSchedule(input.draft, setup.draft, event);
    next.revision++;
    const saved = {
      ...readSetupState(await persistSetup(event, next)),
      savedFromRevision: input.revision,
    };
    await writeAuditLog({
      actorUserId: context.userId,
      eventId: context.event.id,
      action: "update",
      resourceType: "event_setup",
      resourceId: context.event.id,
      module: "event_setup",
      descriptionTh: input.branding
        ? "บันทึก Branding"
        : "บันทึกฉบับร่างอีเวนต์",
      descriptionEn: input.branding
        ? "Saved branding"
        : "Saved event draft",
    });
    return saved;
  });
}

async function registrationForWhitelist(eventId: string) {
  const rows = await mockApi.get<MockForm[]>(`/forms?event_id=${encodeURIComponent(eventId)}`);
  const registrations = rows.filter((row) => row.event_id === eventId && row.type === "registration" && !row.deleted_at);
  if (registrations.length !== 1) return null;
  const form = await getForm(registrations[0].id);
  if (form.eventId !== eventId || form.type !== "registration") return null;
  const field = whitelistUniqueField(form);
  if (!field) return null;
  const stored = await loadStoredWhitelist(eventId, form.id, field);
  return { formId: form.id, field, ...stored };
}

async function loadStoredWhitelist(eventId: string, formId: string, field: WhitelistUniqueField) {
  const rows = await mockApi.get<MockWhitelistEntry[]>(
    `/whitelist_entries?event_id=${encodeURIComponent(eventId)}`,
  ).catch((error: unknown) => {
    if (error instanceof MockApiError && error.status === 404) return [];
    throw error;
  });
  const scoped = rows.filter((entry) => entry.event_id === eventId && !entry.deleted_at && entry.access_code);
  const submissions = scoped.some((entry) => entry.participant_submission_id)
    ? await mockApi.getFresh<MockFormSubmission[]>(`/form_submissions?form_id=${encodeURIComponent(formId)}&status=submitted`)
    : [];
  const completed = new Set(submissions.filter((row) =>
    row.event_id === eventId && row.form_id === formId &&
    row.participant_kind === "registration" && activeSubmission(row),
  ).map((row) => row.id));
  const inactiveJoins = new Set<string>();
  const existing: WhitelistEntry[] = [];
  for (const entry of scoped) {
    const uniqueId = normalizeWhitelistId(entry.access_code, field.type);
    if (!uniqueId) continue;
    const restored: WhitelistEntry = {
      id: entry.id,
      uniqueId,
      name: entry.username,
      status: entry.status,
    };
    if (entry.participant_submission_id) {
      restored.status = completed.has(entry.participant_submission_id) ? "joined" : "available";
      if (restored.status === "available") inactiveJoins.add(entry.id);
    }
    if (restored.status === "joined" || parseWhitelistEntries([restored], field)) existing.push(restored);
  }
  return { existing, inactiveJoins };
}

function whitelistForField(setup: SetupRecord, form: Awaited<ReturnType<typeof registrationForWhitelist>>) {
  if (!form) return [];
  const saved = setup.whitelist;
  const sameField = saved?.formId === form.formId && saved.fieldId === form.field.id && saved.kind === form.field.type;
  const savedEntries = (saved?.entries ?? []).map((entry) => form.inactiveJoins.has(entry.id)
    ? { ...entry, status: "available" as const } : entry);
  const eligible = sameField ? savedEntries : form.existing;
  const merged = new Map(eligible.map((entry) => [entry.uniqueId, entry]));
  for (const used of [...form.existing, ...savedEntries]) {
    if (used.status === "joined") merged.set(used.uniqueId, used);
  }
  return [...merged.values()];
}

async function whitelistForPublication(eventId: string, setup: SetupRecord, registration: PublicationForm | null) {
  const field = whitelistUniqueField(registration);
  if (!registration || registration.eventId !== eventId || !field) return null;
  const saved = setup.whitelist;
  if (saved && (saved.formId !== registration.id || saved.fieldId !== field.id || saved.kind !== field.type)) {
    return null;
  }
  const stored = await loadStoredWhitelist(eventId, registration.id, field);
  const form = { formId: registration.id, field, ...stored };
  const list = { formId: registration.id, fieldId: field.id, kind: field.type, entries: whitelistForField(setup, form) };
  const access = boundWhitelistAccess(list, registration);
  return access ? { ...list, entries: access.entries } : null;
}

function assertWhitelistEnabled(event: MockEvent, setup: SetupRecord) {
  if (!(setup.draft?.isPrivate ?? event.is_private)) {
    throw new ServiceError("SETUP_WHITELIST_UNAVAILABLE", 409);
  }
}

export async function getSetupWhitelist(context: SetupContext) {
  if (!context.workspace.canManageWhitelist) throw new ServiceError("FORBIDDEN", 403);
  const setup = readSetupRecord(context.event);
  editable(context.event, setup);
  assertWhitelistEnabled(context.event, setup);
  const form = await registrationForWhitelist(context.event.id);
  return {
    revision: setup.revision,
    entries: whitelistForField(setup, form),
    uniqueField: form?.field ?? null,
  };
}

async function prepareWhitelist(
  event: MockEvent,
  setup: SetupRecord,
  entries: WhitelistEntry[],
) {
  assertWhitelistEnabled(event, setup);
  const form = await registrationForWhitelist(event.id);
  if (!form) throw new ServiceError("SETUP_UNIQUE_FIELD_REQUIRED", 422);
  const existing = whitelistForField(setup, form);
  const used = existing.filter((entry) => entry.status === "joined");
  const retainedIds = new Set(used.map((item) => item.id));
  const retainedKeys = new Set(used.map((item) => item.uniqueId));
  const normalized = parseWhitelistEntries(entries.filter((item) => item.status === "available"), form.field);
  if (!normalized) throw new ServiceError("INVALID_SETUP_WHITELIST", 422);
  const next = new Map(used.map((entry) => [entry.uniqueId, entry]));
  for (const entry of normalized) {
    if (entry.status === "joined" || retainedIds.has(entry.id) || retainedKeys.has(entry.uniqueId)) continue;
    next.set(entry.uniqueId, { ...entry, status: "available" });
  }
  return { formId: form.formId, fieldId: form.field.id, kind: form.field.type, entries: [...next.values()] };
}

export async function updateSetupWhitelist(
  context: SetupContext,
  input: { revision: number; entries: WhitelistEntry[] },
) {
  if (!context.workspace.canManageWhitelist) throw new ServiceError("FORBIDDEN", 403);
  return writeSerially(context.event.id, async () => {
    const event = await loadSetupEvent(context.event.id);
    const setup = readSetupRecord(event);
    editable(event, setup);
    const whitelist = await prepareWhitelist(event, setup, input.entries);
    if (isDeepStrictEqual(whitelist, setup.whitelist)) {
      return getSetupWhitelist({ ...context, event });
    }
    assertRevision(setup, input.revision);
    const saved = await persistSetup(event, { ...setup, revision: setup.revision + 1, whitelist });
    await writeAuditLog({
      actorUserId: context.userId,
      eventId: context.event.id,
      action: "update",
      resourceType: "whitelist",
      resourceId: context.event.id,
      module: "event_setup",
      descriptionTh: "อัปเดตรายชื่อผู้มีสิทธิ์เข้าร่วมอีเวนต์",
      descriptionEn: "Updated whitelist",
      metadata: { count: whitelist.entries.length },
    });
    return getSetupWhitelist({ ...context, event: saved });
  });
}

export async function recoverSetupDraft(
  context: SetupContext,
  input: {
    revision: number;
    replace: boolean;
    draft?: EventDraft;
    branding?: BrandingChange[];
    entries?: WhitelistEntry[];
    oldPublication?: NonNullable<SetupRecord["publication"]>;
  },
): Promise<EventSetupState> {
  assertCanManageEvent(context);
  if (input.entries && !context.workspace.canManageWhitelist) throw new ServiceError("FORBIDDEN", 403);
  return writeSerially(context.event.id, async () => {
    const event = await loadSetupEvent(context.event.id);
    const setup = readSetupRecord(event);
    editable(event, setup);
    const next = { ...setup, branding: { ...setup.branding }, pendingMedia: { ...setup.pendingMedia } };
    if (input.draft) next.draft = canonicalDraft(input.draft);
    for (const { locale, value, pendingMedia = [] } of input.branding ?? []) {
      await checkBranding(event.id, value);
      next.branding[locale] = value;
      next.pendingMedia[locale] = [...new Set(pendingMedia)];
    }
    if (input.entries) next.whitelist = await prepareWhitelist(event, next, input.entries);
    if (input.oldPublication) {
      await checkBranding(event.id, input.oldPublication.branding);
      next.recoveredPublication = setup.recoveredPublication ?? input.oldPublication;
    }
    if (isDeepStrictEqual(next, setup)) return readSetupState(event);
    assertRevision(setup, input.revision);
    if (setup.revision !== 0 && !input.replace) throw new ServiceError("SETUP_RECOVERY_CONFLICT", 409);
    next.revision++;
    return readSetupState(await persistSetup(event, next));
  });
}

export async function publishSetup(
  context: SetupContext,
  input: { revision: number; locale: Locale },
): Promise<EventSetupState> {
  if (context.workspace.userRole !== "event_owner") throw new ServiceError("FORBIDDEN", 403);
  return writeSerially(context.event.id, async () => {
    const event = await loadSetupEvent(context.event.id);
    const setup = readSetupRecord(event);
    if (setup.publication && setup.revision === input.revision + 1) return readSetupState(event, context.workspace.viewableFormTypes);
    assertCanManageEvent(context);
    editable(event, setup);
    assertRevision(setup, input.revision);
    if (!setup.draft) throw new ServiceError("SETUP_DRAFT_REQUIRED", 422);
    if (Object.values(setup.pendingMedia).some((entries) => entries.length)) {
      throw new ServiceError("SETUP_MEDIA_PENDING", 422);
    }

    const draft = setup.draft;
    const detailIssue = requiredEventDetail(draft);
    if (detailIssue) throw new ServiceError("SETUP_EVENT_DETAILS_REQUIRED", 422, undefined, detailIssue);
    const types: FormType[] = [];
    if (draft.hasRegistration) types.push("registration");
    if (draft.hasSurvey) types.push("survey");
    const { forms } = types.length ? await listForms(event.id, types) : { forms: [] };
    const definitions: PublicationForms = { registration: null, survey: null };
    for (const type of types) {
      const form = formForPublication(type, forms);
      if (!form || form.eventId !== event.id) {
        const code = type === "registration" ? "SETUP_REGISTRATION_FORM_REQUIRED" : "SETUP_SURVEY_FORM_REQUIRED";
        throw new ServiceError(code, 422);
      }
      definitions[type] = {
        ...form,
        opensAt: draft.startsAt,
        closesAt: type === "registration" ? draft.endsAt : surveyClosingTime(draft),
      };
    }
    const whitelist = draft.isPrivate ? await whitelistForPublication(event.id, setup, definitions.registration) : null;
    if (draft.isPrivate && !whitelist) {
      throw new ServiceError("SETUP_WHITELIST_REQUIRED", 422);
    }
    await Promise.all(Object.values(setup.branding).map((branding) => checkBranding(event.id, branding)));
    const now = Date.now();
    const publishedAt = new Date(now).toISOString();
    const branding =
      setup.branding[input.locale] ??
      setup.branding[draft.content?.defaultLocale ?? ""] ??
      defaultEventBranding;
    const publication = publicationSchema.parse({
      publishedAt,
      draft,
      branding,
      forms: definitions,
    });
    const next = {
      ...setup,
      revision: setup.revision + 1,
      publication,
      ...(whitelist ? { whitelist } : {}),
      publishedBranding: setup.branding,
    };
    const hasStarted = Date.parse(draft.startsAt!) <= now;
    const hasEnded = Date.parse(draft.endsAt!) <= now;
    const saved = await persistSetup(event, next, {
      status: hasEnded ? "closed" : hasStarted ? "open" : "scheduled",
      ...(hasStarted && !hasEnded ? { opens_at: publishedAt } : {}),
      ...(hasEnded ? { closes_at: publishedAt } : {}),
      start_at: draft.startsAt,
      end_at: draft.endsAt,
      is_private: draft.isPrivate,
      has_registration: draft.hasRegistration,
      has_survey: draft.hasSurvey,
      survey_access: draft.surveyAccess,
      updated_at: publishedAt,
      updated_by: context.userId,
    });
    return readSetupState(saved, context.workspace.viewableFormTypes);
  });
}
