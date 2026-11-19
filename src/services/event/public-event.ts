import { MockApiError, mockApi } from "@/core/api/mock-client";
import { ServiceError } from "@/core/api/service-error";
import { projectEventContent } from "@/core/event/content";
import type { LocalPublication } from "@/core/event/publication";
import { readSetupRecord } from "@/core/event/setup-storage";
import { defaultEventBranding } from "@/core/event/branding";
import {
  isPublicEventSlug,
  publicEventPath,
} from "@/core/event/public-event-paths";
import { eventShareOrigin, eventShareUrl } from "@/core/event/share-links";
import { eventQrDataUrl } from "@/core/event/share-qr";
import { resolveFormWindows } from "@/core/forms/lifecycle";
import {
  matchPublishedForm,
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
} from "@/types/event/public-event";
import type {
  MockEvent,
  MockEventBanner,
  MockEventFormSettings,
  MockEventTranslation,
  MockForm,
  MockFormSubmission,
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

async function findPublicEvent(slug: string): Promise<MockEvent | null> {
  if (!isPublicEventSlug(slug)) return null;

  const events = await mockApi.get<MockEvent[]>(
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

function needsEligibility(
  event: MockEvent,
  kind: ParticipantFormKind,
  publication: LocalPublication | null,
) {
  // The local Whitelist prototype and preview answers are not shared eligibility records.
  return kind === "registration"
    ? publication?.draft.isPrivate ?? event.is_private
    : (publication ? publication.draft.surveyAccess : event.survey_access) ===
        "registered_only";
}

async function loadPublishedForms(eventId: string) {
  const rows = await mockApi.get<MockForm[]>(
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
  if (
    !isEnabled(event, kind, publication) ||
    needsEligibility(event, kind, publication)
  ) return null;

  if (publication) {
    const snapshot = publication.forms[kind];
    if (!snapshot || !hasShareableContent(snapshot)) return null;
    const stored = rows.find((form) => form.id === snapshot.id && form.type === kind);
    const row = stored ? matchPublishedForm(stored, snapshot) : null;
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
  publication: LocalPublication | null,
): Promise<EventShareResponse["windows"]> {
  const empty = { registration: null, survey: null };
  if (
    !isPublishedEvent(event) ||
    !formKinds.some(
      (kind) =>
        isEnabled(event, kind, publication) && !needsEligibility(event, kind, publication),
    )
  ) {
    return empty;
  }

  const rows = await loadPublishedForms(event.id);
  const [registration, survey] = await Promise.all(
    formKinds.map(async (kind) => {
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
    loadShareableWindows(event, setup.publication),
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
    readSetupRecord(publicEvent).publication,
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
): Promise<PublicForm | null> {
  const event = await findPublicEvent(slug);
  if (!event) return null;
  return resolvePublicForm(event, kind, readSetupRecord(event).publication);
}

export async function getPublicFormPageBySlug(
  slug: string,
  kind: ParticipantFormKind,
  locale: Locale,
) {
  const event = await findPublicEvent(slug);
  if (!event) return null;
  const { publication, publishedBranding } = readSetupRecord(event);
  const result = await resolvePublicForm(event, kind, publication);
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
  return { result, branding, bannerUrl };
}

async function resolvePublicForm(
  event: MockEvent,
  kind: ParticipantFormKind,
  publication: LocalPublication | null,
): Promise<PublicForm | null> {
  if (!isEnabled(event, kind, publication)) return null;
  if (event.status === "scheduled") return { status: "scheduled" };
  if (needsEligibility(event, kind, publication)) return { status: "restricted" };

  const result = await findShareableForm(
    event,
    kind,
    await loadPublishedForms(event.id),
    publication,
  );
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

  const settings = await mockApi.get<MockEventFormSettings[]>(
    `/event_form_settings?event_id=${encodeURIComponent(event.id)}`,
  );
  const capacity = publication ? (kind === "registration" ? publication.draft.registrationCapacity : publication.draft.surveyCapacity) : settings.find(
    (entry) =>
      entry.event_id === event.id &&
      entry.form_type === kind &&
      !entry.is_unlimited,
  )?.capacity;
  if (capacity != null) {
    const submissions = await mockApi.get<MockFormSubmission[]>(
      `/form_submissions?form_id=${encodeURIComponent(row.id)}`,
    );
    if (
      submissions.filter(
        (submission) =>
          submission.form_id === row.id && submission.status === "submitted",
      ).length >= capacity
    ) {
      return { status: "full" };
    }
  }

  return { status: "open", form: { head: form.head, type: form.type, questions: form.questions } };
}
