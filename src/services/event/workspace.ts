import { MockApiError, mockApi } from "@/core/api/mock-client";
import {
  DEFAULT_ADMIN_MATRIX,
  satisfiesAccessLevel,
} from "@/core/auth/event-permissions";
import {
  eventContentSchema,
  getEventContent,
  normalizeContentLocale,
  resolveEventTranslation,
} from "@/core/event/content";
import { readSetupState } from "@/core/event/setup-storage";
import { canAccessEventDashboard } from "@/core/event/dashboard-policy";
import { getEventAccessForUser } from "@/core/mock/access";
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
  MockUser,
} from "@/types/mock";

export type WorkspaceLookupOptions = {
  /** Platform admin inspecting this event — full unrestricted access. */
  inspectedEventId?: string | null;
};

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

async function loadWorkspacePayload(
  eventId: string,
  locale: Locale,
  options: {
    userRole: EventWorkspace["userRole"];
    customRoleName: string | null;
    matrix: typeof DEFAULT_ADMIN_MATRIX;
    includeTeam: boolean;
    /** When false, dashboard/forms stay closed even if the matrix would allow them. */
    hasAccessRow?: boolean;
  },
): Promise<EventWorkspace | null> {
  const [event, translations, banners, members, settings] = await Promise.all([
    mockApi
      .get<MockEvent>(`/events/${encodeURIComponent(eventId)}`)
      .catch((error: unknown) => {
        if (error instanceof MockApiError && error.status === 404) return null;
        throw error;
      }),
    mockApi.get<MockEventTranslation[]>(
      `/event_translations?event_id=${encodeURIComponent(eventId)}`,
    ),
    mockApi.get<MockEventBanner[]>(
      `/event_banners?event_id=${encodeURIComponent(eventId)}`,
    ),
    mockApi.get<MockUser[]>(`/users?event_id=${encodeURIComponent(eventId)}`),
    mockApi.get<MockEventFormSettings[]>(
      `/event_form_settings?event_id=${encodeURIComponent(eventId)}`,
    ),
  ]);
  if (!event || event.id !== eventId || event.deleted_at) return null;

  const content = bindEventContent(event, translations);
  const translation = resolveEventTranslation(content, locale);
  const matrix = options.matrix;

  const activeMembers = members.filter(
    (member) => member.event_id === eventId && isActiveMockUser(member),
  );
  const memberAccess = await Promise.all(
    activeMembers.map(async (member) => ({
      member,
      permissions: await getRolePermissions(member.id, eventId),
    })),
  );
  const subUsers = memberAccess
    .filter(
      ({ member, permissions: codes }) =>
        mapMockUserToUser(member, codes)?.role === "sub_user",
    )
    .map(({ member }) => ({ id: member.id, name: member.display_name }));

  const registrationSettings = settings.find(
    (row) => row.event_id === eventId && row.form_type === "registration",
  );
  const surveySettings = settings.find(
    (row) => row.event_id === eventId && row.form_type === "survey",
  );
  const canEditEvent = event.status === "draft" && matrix.event === "can_edit";
  const setup = readSetupState(event);
  const canManageWhitelist = matrix.registrationForm === "can_edit";
  const whitelistEnabledForSetup =
    canManageWhitelist &&
    (setup.draft?.isPrivate ?? event.is_private) &&
    (setup.draft?.hasRegistration ?? event.has_registration);

  return {
    setup: canEditEvent || setup.publication ? setup : readSetupState({}),
    whitelistEnabledForSetup,
    registrationCapacity: registrationSettings?.is_unlimited
      ? null
      : (registrationSettings?.capacity ?? null),
    surveyCapacity: surveySettings?.is_unlimited
      ? null
      : (surveySettings?.capacity ?? null),
    canManageSurveyForm: matrix.surveyForm === "can_edit",
    canManageWhitelist,
    canEditEvent,
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
    bannerUrl:
      banners.find((banner) => banner.event_id === eventId)?.banner_url ?? null,
    subUserCount: subUsers.length,
    subUsers: options.includeTeam ? subUsers : [],
    eventId: event.id,
    eventName: translation.title,
    eventStatus: event.status,
    userRole: options.userRole,
    customRoleName: options.customRoleName,
    canAccessDashboard:
      (options.hasAccessRow !== false) &&
      canAccessEventDashboard(event.status, matrix.dashboard, "view_only"),
    canAccessForms:
      (options.hasAccessRow !== false) &&
      (satisfiesAccessLevel(matrix.registrationForm, "view_only") ||
        satisfiesAccessLevel(matrix.surveyForm, "view_only")),
  };
}

/** Resolve the event workspace for an event user, or a platform inspector. */
export async function getEventWorkspace(
  userId: string,
  locale: Locale = routing.defaultLocale,
  options: WorkspaceLookupOptions = {},
): Promise<EventWorkspace | null> {
  const inspectedEventId = options.inspectedEventId?.trim() || null;
  if (inspectedEventId) {
    const mockUser = await mockApi.get<MockUser>(
      `/users/${encodeURIComponent(userId)}`,
    );
    if (
      !mockUser ||
      !isActiveMockUser(mockUser) ||
      mockUser.system_role !== "platform_admin"
    ) {
      return null;
    }
    return loadWorkspacePayload(inspectedEventId, locale, {
      userRole: "event_owner",
      customRoleName: null,
      matrix: { ...DEFAULT_ADMIN_MATRIX },
      includeTeam: true,
      hasAccessRow: true,
    });
  }

  const mockUser = await mockApi.get<MockUser>(
    `/users/${encodeURIComponent(userId)}`,
  );
  if (!mockUser || !isActiveMockUser(mockUser)) return null;

  const eventId = mockUser.event_id;
  if (!eventId) return null;

  const access = await getEventAccessForUser(mockUser.id, eventId);
  const permissions = await getRolePermissions(mockUser.id, eventId);
  const user = mapMockUserToUser(mockUser, permissions);
  if (!user || (user.role !== "event_owner" && user.role !== "sub_user")) {
    return null;
  }

  return loadWorkspacePayload(eventId, locale, {
    userRole: user.role,
    customRoleName: user.role === "sub_user" ? access.roleName : null,
    matrix: access.matrix,
    includeTeam: user.role === "event_owner",
    hasAccessRow: Boolean(access.row),
  });
}
