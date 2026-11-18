import { mockApi } from "@/core/api/mock-client";
import { ServiceError } from "@/core/api/service-error";
import { sendSetupPasswordInvite } from "@/core/mail/send-invite";
import { resolveEventTitle } from "@/core/mock/event-title";
import { routing, type Locale } from "@/i18n/routing";
import type {
  AdminEventDetail,
  AdminEventListItem,
  AdminEventMember,
  AdminEventStatusAction,
  AdminEventTranslationView,
  AdminEventsResponse,
  AssignableAdmin,
  CreateAdminEventInput,
  CreateAdminEventResult,
  EventCloseWarning,
  UpdateAdminEventInput,
} from "@/types/admin/events";
import type {
  MockEvent,
  MockEventBanner,
  MockEventStatus,
  MockEventTranslation,
  MockForm,
  MockFormType,
  MockPermissionCode,
  MockRole,
  MockUser,
} from "@/types/mock";
import { randomBytes, randomUUID } from "crypto";

const EVENT_ADMIN_PERMISSIONS: MockPermissionCode[] = [
  "manage_dashboard",
  "manage_event",
  "manage_registration_form",
  "manage_survey_form",
  "manage_sub_user",
];

export type ListAdminEventsQuery = {
  q?: string;
  status?: MockEventStatus | "all";
  startDate?: string;
  endDate?: string;
  locale?: Locale;
};

function nowIso(): string {
  return new Date().toISOString();
}

function canStartEvent(event: Pick<MockEvent, "status" | "start_at">): boolean {
  if (event.status !== "scheduled") return false;
  if (!event.start_at) return false;
  const startMs = Date.parse(event.start_at);
  if (Number.isNaN(startMs)) return false;
  return startMs <= Date.now();
}

function isPostEventSurvey(
  form: MockForm,
  event: MockEvent,
): boolean {
  if (form.type !== "survey") return false;
  if (!event.end_at) return false;
  const endMs = Date.parse(event.end_at);
  if (Number.isNaN(endMs)) return false;
  const opensMs = form.opens_at ? Date.parse(form.opens_at) : null;
  const closesMs = form.closes_at ? Date.parse(form.closes_at) : null;
  if (opensMs !== null && !Number.isNaN(opensMs) && opensMs >= endMs) {
    return true;
  }
  if (closesMs !== null && !Number.isNaN(closesMs) && closesMs > endMs) {
    return true;
  }
  return false;
}

async function loadEventForms(eventId: string): Promise<MockForm[]> {
  const forms = await mockApi
    .get<MockForm[]>(`/forms?event_id=${encodeURIComponent(eventId)}`)
    .catch(() => [] as MockForm[]);
  return forms.filter((form) => !form.deleted_at);
}

export async function getEventCloseWarnings(
  eventId: string,
): Promise<EventCloseWarning[]> {
  let event: MockEvent;
  try {
    event = await mockApi.get<MockEvent>(`/events/${eventId}`);
  } catch {
    throw new ServiceError("EVENT_NOT_FOUND", 404);
  }
  if (!event) throw new ServiceError("EVENT_NOT_FOUND", 404);

  const forms = await loadEventForms(eventId);
  const now = Date.now();
  const warnings: EventCloseWarning[] = [];

  for (const form of forms) {
    if (form.status === "closed" || form.status === "draft") continue;

    const reasons: EventCloseWarning["reasons"] = [];
    if (form.status === "open" || form.status === "scheduled") {
      reasons.push("still_open");
    }

    const closesMs = form.closes_at ? Date.parse(form.closes_at) : null;
    const notExpired =
      form.closes_at === null ||
      (closesMs !== null && !Number.isNaN(closesMs) && closesMs > now);
    if (notExpired) {
      reasons.push("not_expired");
    }

    if (isPostEventSurvey(form, event)) {
      reasons.push("post_event");
    }

    if (reasons.length === 0) continue;
    warnings.push({
      formId: form.id,
      formType: form.type as MockFormType,
      reasons: [...new Set(reasons)],
      closesAt: form.closes_at,
    });
  }

  return warnings;
}

function overlapsRange(
  startsAt: string | null,
  endsAt: string | null,
  startDate?: string,
  endDate?: string,
): boolean {
  if (!startDate && !endDate) return true;
  const rangeStart = startDate ? Date.parse(startDate) : Number.NEGATIVE_INFINITY;
  const rangeEnd = endDate ? Date.parse(endDate) : Number.POSITIVE_INFINITY;
  if (Number.isNaN(rangeStart) || Number.isNaN(rangeEnd)) return true;

  const eventStart = startsAt ? Date.parse(startsAt) : null;
  const eventEnd = endsAt ? Date.parse(endsAt) : null;

  if (eventStart === null && eventEnd === null) return false;

  const effectiveStart = eventStart ?? eventEnd!;
  const effectiveEnd = eventEnd ?? eventStart!;
  return effectiveStart <= rangeEnd && effectiveEnd >= rangeStart;
}

async function loadEventBundle() {
  const [events, translations, users, banners] = await Promise.all([
    mockApi.get<MockEvent[]>("/events"),
    mockApi.get<MockEventTranslation[]>("/event_translations"),
    mockApi.get<MockUser[]>("/users"),
    mockApi.get<MockEventBanner[]>("/event_banners").catch(() => [] as MockEventBanner[]),
  ]);
  return { events, translations, users, banners };
}

function adminForEvent(
  users: MockUser[],
  eventId: string,
): MockUser | undefined {
  return users.find(
    (user) =>
      user.event_id === eventId &&
      user.system_role === "event_user" &&
      user.status !== "removed" &&
      !user.removed_at,
  );
}

function isCompleteEvent(event: MockEvent): boolean {
  return Boolean(event?.id && event.slug && event.status && event.updated_at);
}

function toListItem(
  event: MockEvent,
  translations: MockEventTranslation[],
  users: MockUser[],
  locale: Locale,
): AdminEventListItem {
  const admin = adminForEvent(users, event.id);
  return {
    id: event.id,
    title: resolveEventTitle(translations, event.id, locale) ?? event.slug,
    slug: event.slug,
    status: event.status,
    adminName: admin?.display_name ?? null,
    adminEmail: admin?.email ?? null,
    adminUserId: admin?.id ?? null,
    startsAt: event.start_at ?? null,
    endsAt: event.end_at ?? null,
    updatedAt: event.updated_at ?? event.created_at ?? "",
    canStart: canStartEvent(event),
  };
}

export async function listAdminEvents(
  query: ListAdminEventsQuery = {},
): Promise<AdminEventsResponse> {
  const locale = query.locale ?? routing.defaultLocale;
  const { events, translations, users } = await loadEventBundle();

  const q = query.q?.trim().toLowerCase() ?? "";
  const status = query.status && query.status !== "all" ? query.status : null;

  const filtered = events
    .filter(isCompleteEvent)
    .filter((event) => (status ? event.status === status : true))
    .filter((event) =>
      overlapsRange(event.start_at, event.end_at, query.startDate, query.endDate),
    )
    .map((event) => toListItem(event, translations, users, locale))
    .filter((item) => {
      if (!q) return true;
      return (
        (item.title || "").toLowerCase().includes(q) ||
        (item.slug || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) =>
      (b.updatedAt || "").localeCompare(a.updatedAt || ""),
    );

  return { events: filtered };
}

export async function getAdminEvent(
  id: string,
  locale: Locale = routing.defaultLocale,
): Promise<AdminEventDetail> {
  const [{ events, translations, users, banners }, roles] = await Promise.all([
    loadEventBundle(),
    mockApi.get<MockRole[]>("/roles"),
  ]);
  const event = events.find((row) => row.id === id);
  if (!event) throw new ServiceError("EVENT_NOT_FOUND", 404);

  const base = toListItem(event, translations, users, locale);
  const translationViews: AdminEventTranslationView[] = translations
    .filter((row) => row.event_id === event.id)
    .sort((a, b) => a.display_order - b.display_order)
    .map((row) => ({
      locale: row.locale_code,
      title: row.title,
      description: row.description,
      locationName: row.location_name,
      addressText: row.address_text,
    }));

  const roleById = new Map(roles.map((role) => [role.id, role]));
  const members: AdminEventMember[] = users
    .filter(
      (user) =>
        user.event_id === event.id &&
        user.status !== "removed" &&
        !user.removed_at,
    )
    .map((user) => ({
      id: user.id,
      name: user.display_name ?? user.email ?? user.id,
      email: user.email,
      status: user.status,
      roleName: user.role_id
        ? (roleById.get(user.role_id)?.name ?? null)
        : null,
    }))
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  const bannerUrls = banners
    .filter((row) => row.event_id === event.id)
    .map((row) => row.banner_url);

  return {
    ...base,
    bannerUrls,
    defaultLocale: event.default_locale,
    isPrivate: event.is_private,
    hasRegistration: event.has_registration,
    hasSurvey: event.has_survey,
    surveyAccess: event.survey_access,
    opensAt: event.opens_at,
    closesAt: event.closes_at,
    createdAt: event.created_at,
    translations: translationViews,
    users: members,
  };
}

export async function listAssignableAdmins(): Promise<AssignableAdmin[]> {
  const users = await mockApi.get<MockUser[]>("/users");
  return users
    .filter(
      (user) =>
        user.system_role === "event_user" &&
        user.event_id === null &&
        user.status === "active" &&
        !user.removed_at,
    )
    .map((user) => ({
      id: user.id,
      name: user.display_name ?? user.email ?? user.id,
      email: user.email,
    }))
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}

async function assertSlugAvailable(
  slug: string,
  excludeEventId?: string,
): Promise<void> {
  const events = await mockApi.get<MockEvent[]>(
    `/events?slug=${encodeURIComponent(slug)}`,
  );
  if (events.some((event) => event.id !== excludeEventId)) {
    throw new ServiceError("SLUG_EXISTS", 409, "Event slug already exists");
  }
}

async function assertEmailAvailable(email: string): Promise<void> {
  const users = await mockApi.get<MockUser[]>(
    `/users?email=${encodeURIComponent(email)}`,
  );
  if (users.some((user) => user.status !== "removed" && !user.removed_at)) {
    throw new ServiceError("EMAIL_EXISTS", 409, "Email already in use");
  }
}

async function createEventAdminRole(
  eventId: string,
  actorUserId: string,
): Promise<MockRole> {
  const now = nowIso();
  const role = await mockApi.post<MockRole>("/roles", {
    id: randomUUID(),
    event_id: eventId,
    name: "Event Admin",
    description: "Full access for event admin",
    created_at: now,
    created_by: actorUserId,
    updated_at: now,
    updated_by: actorUserId,
    deleted_at: null,
  });

  await Promise.all(
    EVENT_ADMIN_PERMISSIONS.map((permission) =>
      mockApi.post("/role_permissions", {
        id: randomUUID(),
        role_id: role.id,
        permission,
      }),
    ),
  );

  return role;
}

export async function createAdminEvent(
  input: CreateAdminEventInput,
  platformAdminUserId: string,
  locale: Locale = routing.defaultLocale,
): Promise<CreateAdminEventResult> {
  await assertSlugAvailable(input.slug);

  const now = nowIso();
  const eventId = randomUUID();

  let adminUser: MockUser;
  let inviteSent = false;
  let impersonateUserId: string | null = null;

  if (input.mode === "existing") {
    if (!input.existingUserId) {
      throw new ServiceError("VALIDATION_ERROR", 400, "existingUserId required");
    }
    let existing: MockUser;
    try {
      existing = await mockApi.get<MockUser>(`/users/${input.existingUserId}`);
    } catch {
      throw new ServiceError("USER_NOT_FOUND", 404);
    }
    if (
      !existing ||
      existing.system_role !== "event_user" ||
      existing.event_id !== null ||
      existing.status !== "active" ||
      existing.removed_at
    ) {
      throw new ServiceError("USER_NOT_ASSIGNABLE", 409);
    }
    adminUser = existing;
    impersonateUserId = existing.id;
  } else {
    const email = input.adminEmail?.trim().toLowerCase();
    const name = input.adminName?.trim();
    if (!email || !name) {
      throw new ServiceError("VALIDATION_ERROR", 400, "adminName and adminEmail required");
    }
    await assertEmailAvailable(email);
    const tempPassword = randomBytes(18).toString("base64url");
    adminUser = await mockApi.post<MockUser>("/users", {
      id: randomUUID(),
      email,
      password: tempPassword,
      display_name: name,
      system_role: "event_user",
      platform_role_id: null,
      event_id: null,
      role_id: null,
      role_assigned_by_user_id: null,
      role_assigned_at: null,
      status: "invited",
      invited_by_user_id: platformAdminUserId,
      joined_at: null,
      created_at: now,
      updated_at: now,
      removed_at: null,
    });
  }

  const titleTh = input.titleTh.trim();
  const titleEn = input.titleEn.trim();
  const defaultLocale: Locale =
    titleTh && !titleEn ? "th" : !titleTh && titleEn ? "en" : locale;

  const event = await mockApi.post<MockEvent>("/events", {
    id: eventId,
    slug: input.slug,
    status: "draft",
    default_locale: defaultLocale,
    start_at: null,
    end_at: null,
    is_private: false,
    has_registration: false,
    has_survey: false,
    survey_access: null,
    opens_at: null,
    closes_at: null,
    created_at: now,
    created_by: platformAdminUserId,
    updated_at: now,
    updated_by: platformAdminUserId,
  });

  const translationRows: MockEventTranslation[] = [];
  let displayOrder = 1;
  if (titleTh) {
    const row: MockEventTranslation = {
      id: randomUUID(),
      event_id: eventId,
      locale_code: "th",
      display_order: displayOrder++,
      title: titleTh,
      description: null,
      location_name: null,
      address_text: null,
      created_at: now,
      updated_at: now,
    };
    await mockApi.post<MockEventTranslation>("/event_translations", row);
    translationRows.push(row);
  }
  if (titleEn) {
    const row: MockEventTranslation = {
      id: randomUUID(),
      event_id: eventId,
      locale_code: "en",
      display_order: displayOrder++,
      title: titleEn,
      description: null,
      location_name: null,
      address_text: null,
      created_at: now,
      updated_at: now,
    };
    await mockApi.post<MockEventTranslation>("/event_translations", row);
    translationRows.push(row);
  }

  const role = await createEventAdminRole(eventId, platformAdminUserId);

  adminUser = await mockApi.patch<MockUser>(`/users/${adminUser.id}`, {
    event_id: eventId,
    role_id: role.id,
    role_assigned_by_user_id: platformAdminUserId,
    role_assigned_at: now,
    updated_at: now,
  });

  if (input.mode === "new") {
    try {
      await sendSetupPasswordInvite({
        to: adminUser.email,
        displayName: adminUser.display_name,
        userId: adminUser.id,
        eventTitleTh: titleTh,
        eventTitleEn: titleEn,
        eventTitleFallback: input.slug,
      });
      inviteSent = true;
    } catch {
      // Event + invited user are already persisted — do not fail the create
      // (retry would hit EMAIL_EXISTS / SLUG_EXISTS while the draft remains).
      inviteSent = false;
    }
  }

  const item = toListItem(event, translationRows, [adminUser], locale);

  return {
    event: item,
    impersonateUserId,
    inviteSent,
  };
}

/** Platform edits draft event titles + slug only */
export async function updateAdminEvent(
  eventId: string,
  input: UpdateAdminEventInput,
  actorUserId: string,
  locale: Locale = routing.defaultLocale,
): Promise<AdminEventListItem> {
  let event: MockEvent;
  try {
    event = await mockApi.get<MockEvent>(`/events/${eventId}`);
  } catch {
    throw new ServiceError("EVENT_NOT_FOUND", 404);
  }
  if (!event) {
    throw new ServiceError("EVENT_NOT_FOUND", 404);
  }
  if (event.status !== "draft") {
    throw new ServiceError(
      "EVENT_NOT_EDITABLE",
      409,
      "Only draft events can be edited by platform",
    );
  }

  const titleTh = input.titleTh.trim();
  const titleEn = input.titleEn.trim();
  const slug = input.slug.trim();
  await assertSlugAvailable(slug, eventId);

  const now = nowIso();
  const defaultLocale: Locale =
    titleTh && !titleEn ? "th" : !titleTh && titleEn ? "en" : locale;

  const updated = await mockApi.patch<MockEvent>(`/events/${eventId}`, {
    slug,
    default_locale: defaultLocale,
    updated_at: now,
    updated_by: actorUserId,
  });

  const existingTranslations = await mockApi.get<MockEventTranslation[]>(
    `/event_translations?event_id=${encodeURIComponent(eventId)}`,
  );

  async function upsertTitle(localeCode: Locale, title: string) {
    const row = existingTranslations.find(
      (item) => item.locale_code === localeCode,
    );
    if (!title) {
      if (row) {
        await mockApi.delete(`/event_translations/${row.id}`);
      }
      return;
    }
    if (row) {
      await mockApi.patch(`/event_translations/${row.id}`, {
        title,
        updated_at: now,
      });
      return;
    }
    await mockApi.post("/event_translations", {
      id: randomUUID(),
      event_id: eventId,
      locale_code: localeCode,
      display_order: existingTranslations.length + 1,
      title,
      description: null,
      location_name: null,
      address_text: null,
      created_at: now,
      updated_at: now,
    });
  }

  await upsertTitle("th", titleTh);
  await upsertTitle("en", titleEn);

  const { translations, users } = await loadEventBundle();
  return toListItem(updated, translations, users, locale);
}

const STATUS_TRANSITIONS: Record<
  AdminEventStatusAction,
  { from: MockEventStatus[]; to: MockEventStatus }
> = {
  start: { from: ["scheduled"], to: "open" },
  close: { from: ["open"], to: "closed" },
};

export type UpdateAdminEventStatusOptions = {
  force?: boolean;
};

export async function updateAdminEventStatus(
  eventId: string,
  action: AdminEventStatusAction,
  actorUserId: string,
  locale: Locale = routing.defaultLocale,
  options: UpdateAdminEventStatusOptions = {},
): Promise<AdminEventListItem> {
  const transition = STATUS_TRANSITIONS[action];
  let event: MockEvent;
  try {
    event = await mockApi.get<MockEvent>(`/events/${eventId}`);
  } catch {
    throw new ServiceError("EVENT_NOT_FOUND", 404);
  }
  if (!event) {
    throw new ServiceError("EVENT_NOT_FOUND", 404);
  }
  if (event.status === "closed") {
    throw new ServiceError("STATUS_LOCKED", 409, "Cannot reverse closed event");
  }
  if (!transition.from.includes(event.status)) {
    throw new ServiceError(
      "INVALID_TRANSITION",
      409,
      `Cannot ${action} from status ${event.status}`,
    );
  }

  if (action === "start" && !canStartEvent(event)) {
    throw new ServiceError(
      "START_TOO_EARLY",
      409,
      "Event start time has not arrived yet",
    );
  }

  if (action === "close" && !options.force) {
    const warnings = await getEventCloseWarnings(eventId);
    if (warnings.length > 0) {
      throw new ServiceError(
        "CLOSE_HAS_ACTIVE_FORMS",
        409,
        "One or more forms are still open or not expired",
        { warnings },
      );
    }
  }

  const now = nowIso();
  const updated = await mockApi.patch<MockEvent>(`/events/${eventId}`, {
    status: transition.to,
    updated_at: now,
    updated_by: actorUserId,
    ...(action === "start" ? { opens_at: event.opens_at ?? now } : {}),
    ...(action === "close" ? { closes_at: now } : {}),
  });
  const { translations, users } = await loadEventBundle();
  return toListItem(updated, translations, users, locale);
}

export type ScheduleEventInput = {
  startsAt?: string | null;
  endsAt?: string | null;
  description?: string | null;
  locationName?: string | null;
  addressText?: string | null;
};

/** @deprecated alias — event owner schedules the event (draft → scheduled) */
export type SubmitEventApprovalInput = ScheduleEventInput;

/** Event owner completes schedule/details and moves draft → scheduled */
export async function scheduleEvent(
  userId: string,
  input: ScheduleEventInput,
  locale: Locale = routing.defaultLocale,
): Promise<AdminEventListItem> {
  const user = await mockApi.get<MockUser>(`/users/${userId}`);
  if (!user?.event_id) {
    throw new ServiceError("FORBIDDEN", 403);
  }

  let event: MockEvent;
  try {
    event = await mockApi.get<MockEvent>(`/events/${user.event_id}`);
  } catch {
    throw new ServiceError("EVENT_NOT_FOUND", 404);
  }
  if (!event) {
    throw new ServiceError("EVENT_NOT_FOUND", 404);
  }
  if (event.status !== "draft") {
    throw new ServiceError(
      "INVALID_TRANSITION",
      409,
      "Only draft events can be scheduled",
    );
  }

  const startsAt = input.startsAt?.trim() || null;
  const endsAt = input.endsAt?.trim() || null;
  if (!startsAt || !endsAt) {
    throw new ServiceError(
      "VALIDATION_ERROR",
      400,
      "startsAt and endsAt are required to schedule",
    );
  }
  const startMs = Date.parse(startsAt);
  const endMs = Date.parse(endsAt);
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
    throw new ServiceError(
      "VALIDATION_ERROR",
      400,
      "endsAt must be after startsAt",
    );
  }

  const now = nowIso();
  const updated = await mockApi.patch<MockEvent>(`/events/${event.id}`, {
    start_at: startsAt,
    end_at: endsAt,
    status: "scheduled",
    updated_at: now,
    updated_by: userId,
  });

  const translations = await mockApi.get<MockEventTranslation[]>(
    `/event_translations?event_id=${encodeURIComponent(event.id)}`,
  );
  const primary =
    translations.find((row) => row.locale_code === locale) ?? translations[0];
  if (primary) {
    await mockApi.patch(`/event_translations/${primary.id}`, {
      description: input.description ?? primary.description,
      location_name: input.locationName ?? primary.location_name,
      address_text: input.addressText ?? primary.address_text,
      updated_at: now,
    });
  }

  const users = await mockApi.get<MockUser[]>("/users");
  const refreshedTranslations = await mockApi.get<MockEventTranslation[]>(
    `/event_translations?event_id=${encodeURIComponent(event.id)}`,
  );
  return toListItem(updated, refreshedTranslations, users, locale);
}

/** @deprecated use scheduleEvent */
export const submitEventForApproval = scheduleEvent;

export type RunEventLifecycleCronResult = {
  opened: string[];
  closed: string[];
  formsClosed: string[];
};

/**
 * Auto-open scheduled events past start_at, auto-close open events past end_at,
 * and close forms whose closes_at has passed.
 */
export async function runEventLifecycleCron(
  actorUserId: string,
): Promise<RunEventLifecycleCronResult> {
  const [events, forms] = await Promise.all([
    mockApi.get<MockEvent[]>("/events"),
    mockApi.get<MockForm[]>("/forms").catch(() => [] as MockForm[]),
  ]);
  const now = Date.now();
  const stamp = nowIso();
  const opened: string[] = [];
  const closed: string[] = [];
  const formsClosed: string[] = [];

  for (const event of events) {
    if (canStartEvent(event)) {
      await mockApi.patch(`/events/${event.id}`, {
        status: "open",
        opens_at: event.opens_at ?? stamp,
        updated_at: stamp,
        updated_by: actorUserId,
      });
      opened.push(event.id);
      continue;
    }

    if (event.status === "open" && event.end_at) {
      const endMs = Date.parse(event.end_at);
      if (!Number.isNaN(endMs) && endMs <= now) {
        await mockApi.patch(`/events/${event.id}`, {
          status: "closed",
          closes_at: stamp,
          updated_at: stamp,
          updated_by: actorUserId,
        });
        closed.push(event.id);
      }
    }
  }

  for (const form of forms) {
    if (form.deleted_at || form.status === "closed" || !form.closes_at) {
      continue;
    }
    const closesMs = Date.parse(form.closes_at);
    if (Number.isNaN(closesMs) || closesMs > now) continue;
    await mockApi.patch(`/forms/${form.id}`, {
      status: "closed",
      updated_at: stamp,
      updated_by: actorUserId,
    });
    formsClosed.push(form.id);
  }

  return { opened, closed, formsClosed };
}
