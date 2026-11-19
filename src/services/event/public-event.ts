import { MockApiError, mockApi } from "@/core/api/mock-client";
import { ServiceError } from "@/core/api/service-error";
import { projectEventContent } from "@/core/event/content";
import { normalizeWhitelistId, publishedWhitelistAccess } from "@/core/event/whitelist";
import type { SetupRecord } from "@/core/event/setup-state";
import type { LocalPublication } from "@/core/event/publication";
import { readSetupRecord } from "@/core/event/setup-storage";
import { defaultEventBranding } from "@/core/event/branding";
import {
  isPublicEventSlug,
  publicEventPath,
} from "@/core/event/public-event-paths";
import { eventShareOrigin, eventShareUrl } from "@/core/event/share-links";
import { eventQrDataUrl } from "@/core/event/share-qr";
import { activeSubmission, resolveFormWindows } from "@/core/forms/lifecycle";
import {
  readPublishedForm,
  publishedFormDefinition,
} from "@/core/forms/published-schedule";
import { isActiveMockUser, resolveAppRole } from "@/core/mock/map-user";
import { getRolePermissions } from "@/core/mock/role-permissions";
import type { Locale } from "@/i18n/routing";
import { getForm } from "@/services/event/forms";
import type { Form, FormStatus } from "@/types/event/form";
import type { ParticipantFormKind } from "@/types/event/participant";
import type {
  EventShareResponse,
  PublicEvent,
  PublicForm,
  RegistrationProof,
} from "@/types/event/public-event";
import type {
  MockEvent,
  MockEventBanner,
  MockEventFormSettings,
  MockEventTranslation,
  MockForm,
  MockFormSubmission,
  MockRegistration,
  MockWhitelistEntry,
  MockUser,
} from "@/types/mock";

const formKinds = ["registration", "survey"] as const;
const shareableStatuses = new Set([
  "scheduled",
  "open",
  "published",
  "paused",
  "closed",
]);

function isPublishedEvent(event: MockEvent) {
  return event.status === "open" || event.status === "closed";
}

export async function findPublicEvent(slug: string, read = mockApi.get): Promise<MockEvent | null> {
  if (!isPublicEventSlug(slug)) return null;

  const events = await read<MockEvent[]>(
    `/events?slug=${encodeURIComponent(slug)}`,
  );
  const active = events.filter(
    (event) => event.slug === slug && !event.deleted_at,
  );
  const event = active.length === 1 ? active[0] : null;
  return event && (isPublishedEvent(event) || event.status === "scheduled")
    ? event
    : null;
}

function isEnabled(
  event: MockEvent,
  kind: ParticipantFormKind,
  publication: LocalPublication | null,
) {
  return kind === "registration"
    ? publication?.draft.hasRegistration ?? event.has_registration
    : publication?.draft.hasSurvey ?? event.has_survey;
}

function formAccess(event: MockEvent, setup: SetupRecord) {
  const draft = setup.publication?.draft;
  if (!(draft?.isPrivate ?? event.is_private)) return "public" as const;
  if (setup.publication?.forms.registration?.eventId !== event.id) return "restricted" as const;
  return publishedWhitelistAccess(setup) ?? "restricted" as const;
}

async function loadPublishedForms(eventId: string, read = mockApi.get) {
  const rows = await read<MockForm[]>(
    `/forms?event_id=${encodeURIComponent(eventId)}`,
  );
  return rows.filter((form) => form.event_id === eventId && !form.deleted_at);
}

function hasShareableContent(form: { head: Form["head"]; questions: readonly unknown[] }) {
  return !!(form.head.th.title.trim() || form.head.en.title.trim()) &&
    form.questions.length > 0;
}

async function findShareableForm(
  event: MockEvent,
  kind: ParticipantFormKind,
  rows: MockForm[],
  publication: LocalPublication | null,
): Promise<{ row: MockForm; form: Form; status: FormStatus } | null> {
  if (!isEnabled(event, kind, publication)) return null;

  if (publication) {
    const snapshot = publication.forms[kind];
    if (!snapshot || !hasShareableContent(snapshot)) return null;
    const stored = rows.find((form) => form.id === snapshot.id && form.type === kind);
    const row = stored ? readPublishedForm(stored, snapshot, event) : null;
    if (!row || !shareableStatuses.has(row.status)) return null;
    return { row, form: publishedFormDefinition(snapshot), status: row.status };
  }

  const matches = rows.filter((row) => row.type === kind);
  if (matches.length !== 1 || !shareableStatuses.has(matches[0].status))
    return null;

  const row = matches[0];
  try {
    const form = await getForm(row.id);
    return form.eventId === event.id &&
      form.type === kind &&
      shareableStatuses.has(form.status) &&
      hasShareableContent(form)
      ? { row, form, status: form.status }
      : null;
  } catch (error) {
    if (error instanceof ServiceError && error.status === 404) return null;
    throw error;
  }
}

async function loadShareableWindows(
  event: MockEvent,
  setup: SetupRecord,
  includeScheduledSnapshot = false,
): Promise<EventShareResponse["windows"]> {
  const { publication } = setup;
  const empty = { registration: null, survey: null };
  const shareScheduled = includeScheduledSnapshot && event.status === "scheduled" && !!publication;
  if (
    (!isPublishedEvent(event) && !shareScheduled) ||
    !formKinds.some(
      (kind) =>
        isEnabled(event, kind, publication) && formAccess(event, setup) !== "restricted",
    )
  ) {
    return empty;
  }

  const rows = await loadPublishedForms(event.id);
  const [registration, survey] = await Promise.all(
    formKinds.map(async (kind) => {
      if (formAccess(event, setup) === "restricted") return null;
      const result = await findShareableForm(event, kind, rows, publication);
      if (!result) return null;
      const { opensAt, closesAt } = resolveFormWindows(result.row, event);
      const eventEnd = event.end_at ? Date.parse(event.end_at) : NaN;
      const close =
        kind === "registration" && Number.isFinite(eventEnd)
          ? Math.min(closesAt ?? eventEnd, eventEnd)
          : closesAt;
      return {
        opensAt: opensAt === null ? null : new Date(opensAt).toISOString(),
        closesAt: close === null ? null : new Date(close).toISOString(),
      };
    }),
  );
  return { registration, survey };
}

function safeBannerUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export async function getPublicEventBySlug(
  slug: string,
  locale: Locale,
): Promise<PublicEvent | null> {
  const event = await findPublicEvent(slug);
  if (!event) return null;

  const setup = readSetupRecord(event);
  const eventId = encodeURIComponent(event.id);
  const [translations, banners, windows] = await Promise.all([
    mockApi.get<MockEventTranslation[]>(
      `/event_translations?event_id=${eventId}`,
    ),
    mockApi.get<MockEventBanner[]>(`/event_banners?event_id=${eventId}`),
    loadShareableWindows(event, setup),
  ]);
  const localized = translations.filter(
    (translation) => translation.event_id === event.id,
  );
  const content =
    localized.find((translation) => translation.locale_code === locale) ??
    localized.find(
      (translation) => translation.locale_code === event.default_locale,
    ) ??
    localized[0];
  const origin = eventShareOrigin();
  const formLinks: PublicEvent["formLinks"] = {};
  await Promise.all(
    formKinds
      .filter((kind) => windows[kind])
      .map(async (kind) => {
        const href = publicEventPath(slug, kind);
        const qrDataUrl = origin
          ? await eventQrDataUrl(eventShareUrl(origin, slug, kind))
          : undefined;
        formLinks[kind] = { href, qrDataUrl };
      }),
  );

  if (setup.publication) {
    return {
      draft: projectEventContent({
        ...setup.publication.draft,
        hasRegistration: Boolean(formLinks.registration),
        hasSurvey: Boolean(formLinks.survey),
      }, locale),
      branding: setup.publishedBranding?.[locale] ?? setup.publication.branding,
      bannerUrl: safeBannerUrl(banners.find((banner) => banner.event_id === event.id)?.banner_url),
      formLinks,
    };
  }

  const floorZone = content?.floor_zone?.trim() || null;

  return {
    draft: {
      eventName: content?.title || event.slug,
      description: content?.description ?? null,
      locationName: content?.location_name ?? null,
      locationDetail: floorZone ?? undefined,
      startsAt: event.start_at,
      endsAt: event.end_at,
      isPrivate: event.is_private,
      hasRegistration: Boolean(formLinks.registration),
      hasSurvey: Boolean(formLinks.survey),
      surveyAccess: event.survey_access,
      registrationCapacity: null,
      surveyCapacity: null,
    },
    branding: defaultEventBranding,
    bannerUrl: safeBannerUrl(
      banners.find((banner) => banner.event_id === event.id)?.banner_url,
    ),
    formLinks,
  };
}

export async function getAssignedShareLinks(
  userId: string,
): Promise<EventShareResponse | null> {
  let user: MockUser;
  try {
    user = await mockApi.get<MockUser>(`/users/${encodeURIComponent(userId)}`);
  } catch (error) {
    if (!(error instanceof MockApiError && error.status === 404)) throw error;
    throw new ServiceError("FORBIDDEN", 403);
  }

  if (
    !user ||
    !isActiveMockUser(user) ||
    !user.event_id ||
    resolveAppRole(user, await getRolePermissions(user.id, user.event_id)) !==
      "event_owner"
  ) {
    throw new ServiceError("FORBIDDEN", 403);
  }

  const origin = eventShareOrigin();
  if (!origin) return null;

  let event: MockEvent;
  try {
    event = await mockApi.get<MockEvent>(
      `/events/${encodeURIComponent(user.event_id)}`,
    );
  } catch (error) {
    if (error instanceof MockApiError && error.status === 404) return null;
    throw error;
  }
  if (
    !event ||
    event.id !== user.event_id ||
    event.deleted_at ||
    (!isPublishedEvent(event) && !(event.status === "scheduled" && readSetupRecord(event).publication)) ||
    !isPublicEventSlug(event.slug)
  )
    return null;

  const publicEvent = await findPublicEvent(event.slug);
  if (publicEvent?.id !== event.id) {
    return null;
  }

  const windows = await loadShareableWindows(
    publicEvent,
    readSetupRecord(publicEvent),
    true,
  );
  return {
    links: {
      event: eventShareUrl(origin, event.slug),
      registration: windows.registration
        ? eventShareUrl(origin, event.slug, "registration")
        : null,
      survey: windows.survey
        ? eventShareUrl(origin, event.slug, "survey")
        : null,
    },
    windows,
    eventEndsAt: publicEvent.end_at,
  };
}

export async function getPublicFormBySlug(
  slug: string,
  kind: ParticipantFormKind,
  identifier?: unknown,
  proof?: RegistrationProof | null,
): Promise<PublicForm | null> {
  const read = identifier === undefined && !proof ? mockApi.get : mockApi.getFresh;
  const event = await findPublicEvent(slug, read);
  if (!event) return null;
  return publicResult(await resolvePublicForm(event, kind, readSetupRecord(event), identifier, proof, read));
}

export async function getPublicFormPageBySlug(
  slug: string,
  kind: ParticipantFormKind,
  locale: Locale,
  proof?: RegistrationProof | null,
) {
  const event = await findPublicEvent(slug);
  if (!event) return null;
  const setup = readSetupRecord(event);
  const { publication, publishedBranding } = setup;
  const result = publicResult(await resolvePublicForm(event, kind, setup, undefined, proof));
  if (!result) return null;

  const branding = publication
    ? publishedBranding?.[locale] ?? publication.branding
    : defaultEventBranding;
  let bannerUrl = branding.banner?.url ?? null;
  if (branding.backgroundMode === "blur" && !bannerUrl) {
    const banners = await mockApi.get<MockEventBanner[]>(
      `/event_banners?event_id=${encodeURIComponent(event.id)}`,
    );
    bannerUrl = safeBannerUrl(banners.find((banner) => banner.event_id === event.id)?.banner_url);
  }
  const hasSurvey = kind === "registration" && isEnabled(event, "survey", publication) && formAccess(event, setup) !== "restricted" &&
    (publication ? !!publication.forms.survey && hasShareableContent(publication.forms.survey) :
      !!await findShareableForm(event, "survey", await loadPublishedForms(event.id), null));
  return { result, branding, bannerUrl, hasSurvey };
}

async function hasJoinedRegistration(eventId: string, formId: string, fieldType: "email" | "short_text" | "number", identifier: string) {
  const joined = await mockApi.getFresh<MockWhitelistEntry[]>(
    `/whitelist_entries?event_id=${encodeURIComponent(eventId)}&status=joined`,
  ).catch((error: unknown) => {
    if (error instanceof MockApiError && error.status === 404) return [];
    throw error;
  });
  const matches = joined.filter((entry) => entry.event_id === eventId && !entry.deleted_at && entry.status === "joined" &&
    entry.access_code && normalizeWhitelistId(entry.access_code, fieldType) === identifier);
  for (const entry of matches) {
    if (!entry.participant_submission_id) return true;
    const rows = await mockApi.getFresh<MockFormSubmission[]>(`/form_submissions?id=${encodeURIComponent(entry.participant_submission_id)}`);
    if (rows.some((row) => row.id === entry.participant_submission_id && row.event_id === eventId && row.form_id === formId &&
        row.participant_kind === "registration" && activeSubmission(row))) return true;
  }
  return false;
}

type OpenSubmissionForm = Extract<PublicForm, { status: "open" }> & {
  formId: string;
  capacity: number | null;
  receiptClosesAt?: string | null;
  registrationId?: string;
  whitelist?: { id: string; uniqueId: string; name: string; fieldId: string; fieldType: "email" | "number" | "short_text" };
};
type SubmissionAccess = Exclude<PublicForm, { status: "open" }> | OpenSubmissionForm;

function publicResult(access: SubmissionAccess | null): PublicForm | null {
  return access?.status === "open" ? { status: "open", form: access.form } : access;
}

export async function currentPublicFormId(event: MockEvent, setup: SetupRecord, kind: ParticipantFormKind, read: typeof mockApi.get) {
  if (!isEnabled(event, kind, setup.publication)) return null;
  const rows = (await loadPublishedForms(event.id, read)).filter((row) => row.type === kind);
  const frozen = setup.publication?.forms[kind];
  if (setup.publication) return frozen?.eventId === event.id && rows.some((row) => row.id === frozen.id) ? frozen.id : null;
  return rows.length === 1 ? rows[0].id : null;
}

export async function verifiedRegistration(
  event: MockEvent, setup: SetupRecord, proof: RegistrationProof | null | undefined,
) {
  if (!proof || proof.eventId !== event.id) return false;
  const access = formAccess(event, setup);
  if (access === "restricted") return false;
  const read = mockApi.getFresh;
  const registrationFormId = await currentPublicFormId(event, setup, "registration", read);
  if (!registrationFormId || proof.registrationFormId !== registrationFormId) return false;
  const id = encodeURIComponent(proof.submissionId);
  const rows = await read<MockFormSubmission[]>(`/form_submissions?id=${id}`);
  if (!rows.some((row) => row.id === proof.submissionId && row.form_id === registrationFormId && activeSubmission(row))) return false;
  const registrations = await read<MockRegistration[]>(`/registrations?submission_id=${id}`);
  return registrations.some((row) => row.submission_id === proof.submissionId &&
    (access === "public" || access.entries.some((entry) => entry.id === row.whitelist_entry_id)));
}

function registrationReceiptClosesAt(event: MockEvent, setup: SetupRecord, rows: MockForm[]) {
  const surveys = rows.filter((row) => row.type === "survey");
  const frozen = setup.publication?.forms.survey;
  let survey: MockForm | null = null;
  if (isEnabled(event, "survey", setup.publication)) {
    if (setup.publication) {
      const stored = surveys.find((row) => row.id === frozen?.id);
      if (stored && frozen) survey = readPublishedForm(stored, frozen, event);
    } else if (surveys.length === 1) {
      survey = surveys[0];
    }
  }
  const { closesAt } = resolveFormWindows(survey ?? { opens_at: null, closes_at: null }, event);
  return closesAt == null ? null : new Date(closesAt).toISOString();
}

export async function resolvePublicForm(
  event: MockEvent, kind: ParticipantFormKind, setup: SetupRecord,
  identifier?: unknown, proof?: RegistrationProof | null, read = mockApi.get,
): Promise<SubmissionAccess | null> {
  if (!isEnabled(event, kind, setup.publication)) return null;
  if (event.status === "scheduled") return { status: "scheduled" };
  const access = formAccess(event, setup);
  if (access === "restricted") return { status: "restricted" };

  const rows = await loadPublishedForms(event.id, read);
  const result = await findShareableForm(event, kind, rows, setup.publication);
  if (!result) return { status: "unavailable" };

  const { row, form, status } = result;
  const { opensAt, closesAt } = resolveFormWindows(row, event);
  const now = Date.now();
  const eventEndsAt = event.end_at ? Date.parse(event.end_at) : null;
  if (
    row.status === "closed" ||
    status === "closed" ||
    (closesAt !== null && now >= closesAt) ||
    (kind === "registration" &&
      (event.status === "closed" ||
        (eventEndsAt !== null && now >= eventEndsAt)))
  ) {
    return { status: "closed" };
  }
  if (
    row.status === "scheduled" ||
    status === "scheduled" ||
    (opensAt !== null && now < opensAt)
  )
    return { status: "scheduled" };
  if (row.status === "paused" || status === "paused")
    return { status: "unavailable" };

  const { publication } = setup;
  const requiresRegistration = kind === "survey" &&
    (publication ? publication.draft.surveyAccess : event.survey_access) === "registered_only";
  let registrationId: string | undefined;
  if (requiresRegistration) {
    if (!await verifiedRegistration(event, setup, proof)) {
      return { status: "registrationRequired" };
    }
    registrationId = proof!.submissionId;
  }
  const settings = publication || requiresRegistration ? [] : await read<MockEventFormSettings[]>(
    `/event_form_settings?event_id=${encodeURIComponent(event.id)}`,
  );
  const capacity = requiresRegistration ? null : publication
    ? (kind === "registration" ? publication.draft.registrationCapacity : publication.draft.surveyCapacity) ?? null
    : settings.find((entry) => entry.event_id === event.id && entry.form_type === kind && !entry.is_unlimited)?.capacity ?? null;
  if (capacity != null) {
    const submissions = await read<MockFormSubmission[]>(`/form_submissions?form_id=${encodeURIComponent(row.id)}`);
    if (submissions.filter((submission) => submission.form_id === row.id && activeSubmission(submission)).length >= capacity) {
      return { status: "full" };
    }
  }

  let whitelist: OpenSubmissionForm["whitelist"];
  if (access !== "public" && !requiresRegistration) {
    const { field, entries } = access;
    const value = typeof identifier === "string" && identifier.length <= 500
      ? normalizeWhitelistId(identifier, field.type) : "";
    const permitted = value && entries.find((entry) =>
      entry.uniqueId === value && (kind !== "registration" || entry.status === "available")
    );
    if (!permitted || (kind === "registration" && await hasJoinedRegistration(event.id, row.id, field.type, value))) {
      const question = publication?.forms.registration?.questions.find((item) => item.question.id === field.id)?.question;
      return {
        status: "eligibility",
        fieldType: field.type,
        label: { th: question?.label.th[0]?.label ?? "", en: question?.label.en[0]?.label ?? "" },
      };
    }
    if (kind === "registration") {
      whitelist = { id: permitted.id, uniqueId: permitted.uniqueId, name: permitted.name, fieldId: field.id, fieldType: field.type };
    }
  }
  return { status: "open", form: { head: form.head, type: form.type, questions: form.questions },
    formId: row.id, capacity, registrationId, whitelist,
    receiptClosesAt: kind === "registration" ? registrationReceiptClosesAt(event, setup, rows) : undefined };
}
