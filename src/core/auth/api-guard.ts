// noinspection ES6PreferShortImport
import { NextResponse, type NextRequest } from "next/server";
import { mockApi } from "@/core/api/mock-client";
import {
  isActiveMockUser,
} from "@/core/mock/map-user";
import { getRolePermissions, hasPermission } from "@/core/mock/role-permissions";
import type { FormType } from "@/types/event/form";
import type { MockUser } from "@/types/mock";
// noinspection ES6PreferShortImport
import {
  AUTH_SESSION_COOKIE,
  parseAuthSessionCookie,
  type AuthSessionCookie,
} from "./cookie";
// noinspection ES6PreferShortImport
import { canEnterAdminArea, canEnterEventArea } from "./permissions";

/**
 * Authorization for /api/admin route handlers.
 *
 * `src/proxy.ts` only gates page navigations — its matcher excludes /api, and
 * an API route is reachable directly from curl with no browser involved. Every
 * handler that returns user data must therefore check the session itself.
 *
 * BR-008 / DR-007 / NFR-005: PII must not leave the API layer for a caller who
 * has no right to it, so "no valid session" and "wrong role" are decided here,
 * before any data is read.
 *
 * Returns a 401/403 response to send back, or null when the caller may proceed.
 */
export function denyUnlessAdmin(request: NextRequest): NextResponse | null {
  const session = parseAuthSessionCookie(
    request.cookies.get(AUTH_SESSION_COOKIE)?.value,
  );

  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!canEnterAdminArea(session.realRole, session.impersonating)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  return null;
}

/**
 * Require a session that may enter the event area.
 * Returns the session, or a 401/403 response.
 */
export function requireEventSession(
  request: NextRequest,
): AuthSessionCookie | NextResponse {
  const session = parseAuthSessionCookie(
    request.cookies.get(AUTH_SESSION_COOKIE)?.value,
  );
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (
    !canEnterEventArea(session.role, session.realRole, session.impersonating)
  ) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  return session;
}

function formPermissionCode(
  type: FormType,
): "manage_registration_form" | "manage_survey_form" {
  return type === "registration"
    ? "manage_registration_form"
    : "manage_survey_form";
}

/**
 * Ensure the session user belongs to `eventId` (when provided) and holds the
 * matching form-manage permission via `role_permissions`.
 */
export async function denyUnlessEventFormManager(
  userId: string,
  formType: FormType,
  eventId?: string,
): Promise<NextResponse | null> {
  let mockUser: MockUser;
  try {
    mockUser = await mockApi.get<MockUser>(`/users/${userId}`);
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  if (!mockUser || !isActiveMockUser(mockUser) || !mockUser.event_id) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  if (eventId && mockUser.event_id !== eventId) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const permissions = await getRolePermissions(mockUser.role_id);
  if (!hasPermission(permissions, formPermissionCode(formType))) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  return null;
}

export function isAuthSession(
  value: AuthSessionCookie | NextResponse,
): value is AuthSessionCookie {
  return !(value instanceof NextResponse);
}
