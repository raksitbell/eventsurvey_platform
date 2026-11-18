import { mockApi } from "@/core/api/mock-client";
import {
  eventContentSchema,
  getEventContent,
  normalizeContentLocale,
  resolveEventTranslation,
} from "@/core/event/content";
import { isActiveMockUser, mapMockUserToUser } from "@/core/mock/map-user";
import { getRolePermissions } from "@/core/mock/role-permissions";
import { routing, type Locale } from "@/i18n/routing";
import type { EventWorkspace } from "@/types/event/workspace";
import type { EventContent } from "@/types/event/content";
import type {
  MockEvent,
  MockEventBanner,
  MockEventFormSettings,
  MockEventTranslation,
  MockRole,
  MockUser,
} from "@/types/mock";

function bindEventContent(
  event: MockEvent,
  rows: MockEventTranslation[],
): EventContent {
  const translations: EventContent["translations"] = [];
  const seen = new Set<string>();
  for (const row of [...rows].sort(
    (a, b) => (a.display_order ?? Infinity) - (b.display_order ?? Infinity),
  )) {
    const localeCode = normalizeContentLocale(row.locale_code);
    if (row.event_id !== event.id || !localeCode || seen.has(localeCode))
      continue;
    const parsed = eventContentSchema.safeParse({
      defaultLocale: localeCode,
      translations: [
        {
          localeCode,
          title: row.title,
          description: row.description ?? null,
          locationName: row.location_name ?? null,
          floorZone: row.floor_zone ?? null,
        },
      ],
    });
    if (parsed.success) {
      seen.add(localeCode);
      translations.push(parsed.data.translations[0]);
    }
  }

  const defaultLocale = normalizeContentLocale(event.default_locale);
  if (!translations.length) {
    return getEventContent(
      { eventName: event.slug, description: null, locationName: null },
      defaultLocale ?? routing.defaultLocale,
    );
  }
  return {
    defaultLocale:
      (defaultLocale && seen.has(defaultLocale) ? defaultLocale : null) ??
      translations[0].localeCode,
    translations,
  };
}

/** Resolve the single event workspace for an event_owner or sub_user */
export async function getEventWorkspace(
  userId: string,
  locale: Locale = routing.defaultLocale,
): Promise<EventWorkspace | null> {
  const mockUser = await mockApi.get<MockUser>(
    `/users/${encodeURIComponent(userId)}`,
  );
  if (!mockUser || !isActiveMockUser(mockUser)) return null;

  const permissions = await getRolePermissions(mockUser.role_id);
  const user = mapMockUserToUser(mockUser, permissions);
  if (!user || (user.role !== "event_owner" && user.role !== "sub_user")) {
    return null;
  }

  const eventId = mockUser.event_id;
  if (!eventId) return null;

  const [event, translations, roles, banners, members, settings] =
    await Promise.all([
      mockApi.get<MockEvent>(`/events/${encodeURIComponent(eventId)}`),
      mockApi.get<MockEventTranslation[]>(
        `/event_translations?event_id=${encodeURIComponent(eventId)}`,
      ),
      mockUser.role_id
        ? mockApi.get<MockRole[]>(
            `/roles?id=${encodeURIComponent(mockUser.role_id)}`,
          )
        : Promise.resolve([] as MockRole[]),
      mockApi.get<MockEventBanner[]>(
        `/event_banners?event_id=${encodeURIComponent(eventId)}`,
      ),
      mockApi.get<MockUser[]>(`/users?event_id=${encodeURIComponent(eventId)}`),
      mockApi.get<MockEventFormSettings[]>(
        `/event_form_settings?event_id=${encodeURIComponent(eventId)}`,
      ),
    ]);

  if (!event) return null;

  const content = bindEventContent(event, translations);
  const translation = resolveEventTranslation(content, locale);

  const customRole =
    user.role === "sub_user" && mockUser.role_id
      ? (roles.find(
          (role) => role.id === mockUser.role_id && !role.deleted_at,
        ) ?? null)
      : null;

  const memberRoles = await Promise.all(
    [
      ...new Set(
        members.filter(isActiveMockUser).map((member) => member.role_id),
      ),
    ]
      .filter((id): id is string => Boolean(id))
      .map(async (id) => ({ id, permissions: await getRolePermissions(id) })),
  );
  const subUsers = members
    .filter((member) => {
      if (!isActiveMockUser(member)) return false;
      const rolePermissions =
        memberRoles.find((role) => role.id === member.role_id)?.permissions ??
        [];
      return mapMockUserToUser(member, rolePermissions)?.role === "sub_user";
    })
    .map((member) => ({ id: member.id, name: member.display_name }));

  const registrationSettings = settings.find(
    (row) => row.form_type === "registration",
  );
  const surveySettings = settings.find((row) => row.form_type === "survey");
  return {
    registrationCapacity: registrationSettings?.is_unlimited
      ? null
      : (registrationSettings?.capacity ?? null),
    surveyCapacity: surveySettings?.is_unlimited
      ? null
      : (surveySettings?.capacity ?? null),
    canManageSurveyForm: permissions.includes("manage_survey_form"),
    canManageWhitelist: permissions.includes("manage_registration_form"),
    canEditEvent:
      event.status === "draft" && permissions.includes("manage_event"),
    surveyAccess: event.survey_access,
    content,
    description: translation.description,
    locationName: translation.locationName,
    locationDetail: translation.floorZone ?? undefined,
    startsAt: event.start_at,
    endsAt: event.end_at,
    isPrivate: event.is_private,
    hasRegistration: event.has_registration,
    hasSurvey: event.has_survey,
    bannerUrl: banners[0]?.banner_url ?? null,
    subUserCount: subUsers.length,
    subUsers: user.role === "event_owner" ? subUsers : [],
    eventId: event.id,
    eventName: translation.title,
    eventStatus: event.status,
    userRole: user.role,
    customRoleName: customRole?.name ?? null,
  };
}
