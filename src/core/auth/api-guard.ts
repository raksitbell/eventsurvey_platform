import { NextResponse, type NextRequest } from "next/server";
import { MockApiError, mockApi } from "@/core/api/mock-client";
import { isActiveMockUser } from "@/core/mock/map-user";
import {
  getRolePermissions,
  hasPermission,
  hasPlatformPermission,
} from "@/core/mock/role-permissions";
import { getActivePortalAccount } from "@/services/auth/session";
import type { FormType } from "@/types/event/form";
import type { MockPermissionCode, MockUser } from "@/types/mock";
// noinspection ES6PreferShortImport
import { readAuthSession, type AuthSessionCookie } from "./cookie";
import { canEnterAdminArea, canEnterEventArea } from "./permissions";
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
  if (!auth.session.impersonating) {
    return { ...auth, impersonatedUser: null };
  }
  try {
    const [target, granted] = await Promise.all([
      getActivePortalAccount(auth.session.userId),
      hasPlatformPermission(realAccount.platformRoleId, "impersonate_event_user"),
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
    !canEnterEventArea(session.role, session.realRole, session.impersonating)
  ) {
    return authJson({ error: "FORBIDDEN" }, 403);
  }
  const auth = await requirePortalSession(session);
  return auth instanceof NextResponse ? auth : auth.session;
}

function formPermissionCode(
  type: FormType,
): "manage_registration_form" | "manage_survey_form" {
  return type === "registration"
    ? "manage_registration_form"
    : "manage_survey_form";
}

/** Check the form-management permission in the user's current event. */
export async function denyUnlessEventFormManager(
  userId: string,
  formType: FormType,
  eventId?: string,
): Promise<NextResponse | null> {
  return denyUnlessEventPermission(
    userId,
    formPermissionCode(formType),
    eventId,
  );
}

/** Ensure an active event user belongs to the event and has a permission. */
export async function denyUnlessEventPermission(
  userId: string,
  permission: MockPermissionCode,
  eventId?: string,
): Promise<NextResponse | null> {
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
      return authJson({ error: "FORBIDDEN" }, 403);
    }

    const permissions = await getRolePermissions(mockUser.role_id);
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
