import { NextResponse, type NextRequest } from "next/server";
import { MockApiError, mockApi } from "@/core/api/mock-client";
import {
  DEFAULT_ADMIN_MATRIX,
  formPermissionModule,
  satisfiesAccessLevel,
} from "@/core/auth/event-permissions";
import { canEnterAdminArea, canEnterEventArea } from "@/core/auth/permissions";
import { getEventAccessForUser } from "@/core/mock/access";
import { isActiveMockUser } from "@/core/mock/map-user";
import {
  getRolePermissions,
  hasPermission,
  hasPlatformPermission,
} from "@/core/mock/role-permissions";
import { getActivePortalAccount } from "@/services/auth/session";
import type { FormType } from "@/types/event/form";
import type { ModuleAccessLevel } from "@/types/event/permissions";
import type { MockPermissionCode, MockUser } from "@/types/mock";
import {
  isInspectingEvent,
  readAuthSession,
  type AuthSessionCookie,
} from "./cookie";
import { authJson, rejectCrossOrigin } from "./route-response";

export async function requireSessionActor(session: AuthSessionCookie | null) {
  if (!session) return authJson({ error: "UNAUTHORIZED" }, 401);

  try {
    const realAccount = await getActivePortalAccount(session.realUserId);
    if (!realAccount || realAccount.user.role !== session.realRole) {
      return authJson({ error: "UNAUTHORIZED" }, 401);
    }
    return { session, realAccount };
  } catch {
    return authJson({ error: "SESSION_UNAVAILABLE" }, 503);
  }
}

export async function requirePortalSession(session: AuthSessionCookie | null) {
  const auth = await requireSessionActor(session);
  if (auth instanceof NextResponse) return auth;

  const { realAccount } = auth;
  if (isInspectingEvent(auth.session)) {
    try {
      const granted = await hasPlatformPermission(
        realAccount.platformRoleId,
        "inspect_event",
      );
      if (!granted) {
        return authJson({ error: "UNAUTHORIZED" }, 401);
      }
      return { ...auth, impersonatedUser: null };
    } catch {
      return authJson({ error: "SESSION_UNAVAILABLE" }, 503);
    }
  }

  if (!auth.session.impersonating) {
    return { ...auth, impersonatedUser: null };
  }
  try {
    // Legacy impersonation sessions still require the inspection grant.
    const [target, granted] = await Promise.all([
      getActivePortalAccount(auth.session.userId),
      hasPlatformPermission(realAccount.platformRoleId, "inspect_event"),
    ]);
    if (!granted || !target || target.user.role !== auth.session.role) {
      return authJson({ error: "UNAUTHORIZED" }, 401);
    }
    return { ...auth, impersonatedUser: target.user };
  } catch {
    return authJson({ error: "SESSION_UNAVAILABLE" }, 503);
  }
}

/** Gate protected BFF requests using the signed identity and current account. */
export async function requireAdminSession(request: NextRequest) {
  const crossOrigin =
    request.method === "GET" || request.method === "HEAD"
      ? null
      : rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;
  const session = readAuthSession(request);
  if (session && !canEnterAdminArea(session.realRole, session.impersonating)) {
    return authJson({ error: "FORBIDDEN" }, 403);
  }
  const auth = await requireSessionActor(session);
  if (auth instanceof NextResponse) return auth;
  return { ...auth.session, platformRoleId: auth.realAccount.platformRoleId };
}

export async function denyUnlessAdmin(request: NextRequest) {
  const auth = await requireAdminSession(request);
  return auth instanceof NextResponse ? auth : null;
}

export async function requireEventSession(request: NextRequest) {
  const crossOrigin =
    request.method === "GET" || request.method === "HEAD"
      ? null
      : rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;
  const session = readAuthSession(request);
  if (
    session &&
    !canEnterEventArea(
      session.role,
      session.realRole,
      session.impersonating,
      session.inspectedEventId,
    )
  ) {
    return authJson({ error: "FORBIDDEN" }, 403);
  }
  const auth = await requirePortalSession(session);
  return auth instanceof NextResponse ? auth : auth.session;
}

async function loadActiveEventUser(
  userId: string,
  eventId?: string,
): Promise<
  | { ok: true; user: MockUser }
  | { ok: false; response: NextResponse }
> {
  try {
    const mockUser = await mockApi.get<MockUser>(
      `/users/${encodeURIComponent(userId)}`,
    );
    if (
      !mockUser ||
      !isActiveMockUser(mockUser) ||
      !mockUser.event_id ||
      (eventId && mockUser.event_id !== eventId)
    ) {
      return { ok: false, response: authJson({ error: "FORBIDDEN" }, 403) };
    }
    return { ok: true, user: mockUser };
  } catch (error) {
    if (error instanceof MockApiError && error.status === 404) {
      return { ok: false, response: authJson({ error: "FORBIDDEN" }, 403) };
    }
    return {
      ok: false,
      response: authJson({ error: "SESSION_UNAVAILABLE" }, 503),
    };
  }
}

export type EventFormAccessLevels = {
  registrationForm: ModuleAccessLevel;
  surveyForm: ModuleAccessLevel;
};

/**
 * Resolve registration/survey matrix levels for the active event user.
 * Platform inspectors get full edit on every form module.
 */
export async function resolveEventFormAccess(
  userId: string,
  eventId?: string,
  session?: AuthSessionCookie | null,
): Promise<
  | { ok: true; access: EventFormAccessLevels }
  | { ok: false; response: NextResponse }
> {
  if (isInspectingEvent(session ?? null)) {
    if (eventId && eventId !== session.inspectedEventId) {
      return { ok: false, response: authJson({ error: "FORBIDDEN" }, 403) };
    }
    return {
      ok: true,
      access: {
        registrationForm: DEFAULT_ADMIN_MATRIX.registrationForm,
        surveyForm: DEFAULT_ADMIN_MATRIX.surveyForm,
      },
    };
  }

  const loaded = await loadActiveEventUser(userId, eventId);
  if (!loaded.ok) return loaded;

  try {
    const access = await getEventAccessForUser(
      loaded.user.id,
      loaded.user.event_id,
    );
    return {
      ok: true,
      access: {
        registrationForm: access.matrix.registrationForm,
        surveyForm: access.matrix.surveyForm,
      },
    };
  } catch (error) {
    if (error instanceof MockApiError && error.status === 404) {
      return { ok: false, response: authJson({ error: "FORBIDDEN" }, 403) };
    }
    return {
      ok: false,
      response: authJson({ error: "SESSION_UNAVAILABLE" }, 503),
    };
  }
}

/**
 * Form list/detail reads use `view_only`; create/update/delete/status need
 * `can_edit`. Levels come from `event_access.matrix` (or full for inspectors).
 */
export async function denyUnlessEventFormAccess(
  userId: string,
  formType: FormType,
  required: ModuleAccessLevel,
  eventId?: string,
  session?: AuthSessionCookie | null,
): Promise<NextResponse | null> {
  const resolved = await resolveEventFormAccess(userId, eventId, session);
  if (!resolved.ok) return resolved.response;

  if (
    !satisfiesAccessLevel(
      resolved.access[formPermissionModule(formType)],
      required,
    )
  ) {
    return authJson({ error: "FORBIDDEN" }, 403);
  }
  return null;
}

/** Form mutations still require module edit access. */
export async function denyUnlessEventFormManager(
  userId: string,
  formType: FormType,
  eventId?: string,
  session?: AuthSessionCookie | null,
): Promise<NextResponse | null> {
  return denyUnlessEventFormAccess(
    userId,
    formType,
    "can_edit",
    eventId,
    session,
  );
}

/** Ensure an active event user belongs to the event and has a permission. */
export async function denyUnlessEventPermission(
  userId: string,
  permission: MockPermissionCode,
  eventId?: string,
  session?: AuthSessionCookie | null,
): Promise<NextResponse | null> {
  if (isInspectingEvent(session ?? null)) {
    if (eventId && eventId !== session.inspectedEventId) {
      return authJson({ error: "FORBIDDEN" }, 403);
    }
    return null;
  }

  const loaded = await loadActiveEventUser(userId, eventId);
  if (!loaded.ok) return loaded.response;

  try {
    const permissions = await getRolePermissions(
      loaded.user.id,
      loaded.user.event_id,
    );
    if (!hasPermission(permissions, permission)) {
      return authJson({ error: "FORBIDDEN" }, 403);
    }
  } catch (error) {
    if (error instanceof MockApiError && error.status === 404) {
      return authJson({ error: "FORBIDDEN" }, 403);
    }
    return authJson({ error: "SESSION_UNAVAILABLE" }, 503);
  }
  return null;
}

export function isAuthSession<T extends AuthSessionCookie>(
  value: T | NextResponse,
): value is T {
  return !(value instanceof NextResponse);
}
