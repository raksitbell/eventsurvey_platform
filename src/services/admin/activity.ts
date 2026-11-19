import { MockApiError, mockApi } from "@/core/api/mock-client";
import { normalizeAuditModuleKey } from "@/core/audit/module-path";
import { normalizeContentLocale } from "@/core/event/content";
import { getEventAccessForUser } from "@/core/mock/access";
import { mapMockUserToUser } from "@/core/mock/map-user";
import { getRolePermissions } from "@/core/mock/role-permissions";
import { routing, type Locale } from "@/i18n/routing";
import type {
  AdminActivityFilters,
  AdminActivityItem,
  AdminActivityResponse,
  AdminUserActivityProfile,
  AdminUserEventMembership,
  AuditActionKind,
} from "@/types/admin/activity";
import type {
  MockAuditLog,
  MockEvent,
  MockEventAccess,
  MockEventTranslation,
  MockUser,
} from "@/types/mock";

function actionKind(action: string): AuditActionKind {
  const normalized = action.trim().toLowerCase();
  if (normalized === "create" || normalized.endsWith(".create")) return "create";
  if (normalized === "update" || normalized.endsWith(".update")) return "update";
  if (normalized === "delete" || normalized.endsWith(".delete")) return "delete";
  if (normalized.startsWith("create")) return "create";
  if (normalized.startsWith("update") || normalized.startsWith("patch")) {
    return "update";
  }
  if (normalized.startsWith("delete") || normalized.startsWith("remove")) {
    return "delete";
  }
  return "other";
}

function bindEventName(
  eventId: string | null,
  events: MockEvent[],
  translations: MockEventTranslation[],
  locale: Locale,
): string | null {
  if (!eventId) return null;
  const event = events.find((row) => row.id === eventId && !row.deleted_at);
  if (!event) return null;
  const rows = translations
    .filter((row) => row.event_id === eventId)
    .sort(
      (a, b) => (a.display_order ?? Infinity) - (b.display_order ?? Infinity),
    );
  const preferred =
    rows.find(
      (row) => normalizeContentLocale(row.locale_code) === locale,
    ) ??
    rows.find(
      (row) =>
        normalizeContentLocale(row.locale_code) ===
        normalizeContentLocale(event.default_locale),
    ) ??
    rows[0];
  return preferred?.title?.trim() || event.slug;
}

function localizeAuditDescription(row: MockAuditLog, locale: Locale): string {
  const th = row.description_th?.trim() || "";
  const en = row.description_en?.trim() || "";
  if (locale === "en") return en || th || row.description?.trim() || row.action;
  return th || en || row.description?.trim() || row.action;
}

async function toActivityItem(
  row: MockAuditLog,
  usersById: Map<string, MockUser>,
  events: MockEvent[],
  translations: MockEventTranslation[],
  locale: Locale,
): Promise<AdminActivityItem> {
  const actor = usersById.get(row.actor_user_id) ?? null;
  let actorRole: string | null = null;
  if (actor) {
    const permissions = await getRolePermissions(
      actor.id,
      actor.event_id ?? undefined,
    );
    actorRole = mapMockUserToUser(actor, permissions)?.role ?? null;
  }

  return {
    id: row.id,
    occurredAt: row.occurred_at,
    actorUserId: row.actor_user_id,
    actorName: actor?.display_name ?? row.actor_user_id,
    actorRole,
    eventId: row.event_id,
    eventName: bindEventName(row.event_id, events, translations, locale),
    action: row.action,
    actionKind: actionKind(row.action),
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    module: normalizeAuditModuleKey(row.module || row.resource_type),
    description: localizeAuditDescription(row, locale),
    metadata:
      row.metadata &&
      typeof row.metadata === "object" &&
      !Array.isArray(row.metadata)
        ? row.metadata
        : null,
    includesUnmaskedPii: row.includes_unmasked_pii === true,
  };
}

function matchesFilters(
  row: MockAuditLog,
  filters: AdminActivityFilters,
): boolean {
  if (filters.actorUserId && row.actor_user_id !== filters.actorUserId) {
    return false;
  }
  if (filters.eventId && row.event_id !== filters.eventId) return false;
  const occurred = new Date(row.occurred_at).getTime();
  if (Number.isNaN(occurred)) return false;
  if (filters.startDate) {
    const start = new Date(filters.startDate).getTime();
    if (!Number.isNaN(start) && occurred < start) return false;
  }
  if (filters.endDate) {
    const end = new Date(filters.endDate).getTime();
    if (!Number.isNaN(end) && occurred > end) return false;
  }
  if (filters.accountType === "platform" && row.event_id) return false;
  if (filters.accountType === "event" && !row.event_id) return false;
  return true;
}

export async function listAdminActivity(
  locale: Locale = routing.defaultLocale,
  filters: AdminActivityFilters = {},
): Promise<AdminActivityResponse> {
  const [logs, users, events, translations] = await Promise.all([
    mockApi.get<MockAuditLog[]>("/audit_logs").catch((error: unknown) => {
      if (error instanceof MockApiError && error.status === 404) return [];
      throw error;
    }),
    mockApi.get<MockUser[]>("/users"),
    mockApi.get<MockEvent[]>("/events"),
    mockApi.get<MockEventTranslation[]>("/event_translations"),
  ]);

  const usersById = new Map(users.map((user) => [user.id, user]));
  const filtered = logs
    .filter((row) => matchesFilters(row, filters))
    .sort(
      (a, b) =>
        new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
    );

  const items = await Promise.all(
    filtered.map((row) =>
      toActivityItem(row, usersById, events, translations, locale),
    ),
  );

  const actorIds = new Set(items.map((item) => item.actorUserId));
  const eventIds = new Set(
    items.map((item) => item.eventId).filter((id): id is string => Boolean(id)),
  );
  const platformCount = items.filter((item) => !item.eventId).length;

  const eventOptions = events
    .filter((event) => !event.deleted_at)
    .map((event) => ({
      id: event.id,
      name: bindEventName(event.id, events, translations, locale) ?? event.slug,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    items,
    stats: {
      total: items.length,
      users: actorIds.size,
      events: eventIds.size,
      platform: platformCount,
    },
    events: eventOptions,
  };
}

async function loadUserMemberships(
  user: MockUser,
  locale: Locale,
): Promise<AdminUserEventMembership[]> {
  const [accessRows, events, translations] = await Promise.all([
    mockApi
      .get<MockEventAccess[]>(
        `/event_access?user_id=${encodeURIComponent(user.id)}`,
      )
      .catch((error: unknown) => {
        if (error instanceof MockApiError && error.status === 404) return [];
        throw error;
      }),
    mockApi.get<MockEvent[]>("/events"),
    mockApi.get<MockEventTranslation[]>("/event_translations"),
  ]);

  const eventIds = new Set<string>();
  for (const row of accessRows) {
    if (!row.deleted_at && row.user_id === user.id) {
      eventIds.add(row.event_id);
    }
  }
  if (user.event_id) eventIds.add(user.event_id);

  const memberships: AdminUserEventMembership[] = [];
  for (const eventId of eventIds) {
    const event = events.find((row) => row.id === eventId && !row.deleted_at);
    if (!event) continue;
    const access = await getEventAccessForUser(user.id, eventId);
    memberships.push({
      id: eventId,
      name: bindEventName(eventId, events, translations, locale) ?? event.slug,
      roleName: access.roleName,
      isEventAdmin: access.canManageSubUsers,
      permissions: access.matrix,
    });
  }

  return memberships.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getAdminUserActivity(
  userId: string,
  locale: Locale = routing.defaultLocale,
  filters: Pick<AdminActivityFilters, "eventId"> = {},
): Promise<AdminUserActivityProfile | null> {
  let user: MockUser;
  try {
    user = await mockApi.get<MockUser>(`/users/${encodeURIComponent(userId)}`);
  } catch (error) {
    if (error instanceof MockApiError && error.status === 404) return null;
    throw error;
  }
  if (!user || user.removed_at) return null;

  const [data, memberships] = await Promise.all([
    listAdminActivity(locale, {
      actorUserId: userId,
      eventId: filters.eventId,
    }),
    loadUserMemberships(user, locale),
  ]);

  const permissions = await getRolePermissions(
    user.id,
    user.event_id ?? undefined,
  );
  const mapped = mapMockUserToUser(user, permissions);

  const eventIds = [
    ...new Set(
      data.items
        .map((item) => item.eventId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const events = data.events.filter((event) => eventIds.includes(event.id));

  return {
    user: {
      id: user.id,
      name: user.display_name,
      email: user.email,
      roleLabel: mapped?.role ?? user.system_role,
    },
    memberships,
    events,
    items: data.items,
  };
}
