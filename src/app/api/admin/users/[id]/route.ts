import { isAuthSession, requireAdminSession } from "@/core/auth/api-guard";
import { authJson, readJsonObject } from "@/core/auth/route-response";
import { hasPlatformPermission } from "@/core/mock/access";
import { ServiceError } from "@/core/api/service-error";
import { routing, type Locale } from "@/i18n/routing";
import {
  deleteAdminUser,
  getAdminUserById,
  updateUserRoleOrEvent,
} from "@/services/admin/users";
import type { UserRole } from "@/types/user";
import type { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const PORTAL_ROLES: UserRole[] = ["super_admin", "event_owner", "sub_user"];

export async function GET(request: NextRequest, context: RouteContext) {
  const session = await requireAdminSession(request);
  if (!isAuthSession(session)) return session;

  if (
    !(await hasPlatformPermission(session.realUserId, "view_platform_users"))
  ) {
    return authJson({ error: "FORBIDDEN" }, 403);
  }

  try {
    const { id } = await context.params;
    const requestedLocale = request.nextUrl.searchParams.get("locale");
    const locale = routing.locales.includes(requestedLocale as Locale)
      ? (requestedLocale as Locale)
      : routing.defaultLocale;
    const user = await getAdminUserById(id, locale);
    if (!user) return authJson({ error: "USER_NOT_FOUND" }, 404);
    return authJson({ user });
  } catch {
    return authJson({ error: "Failed to load user" }, 502);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await requireAdminSession(request);
  if (!isAuthSession(session)) return session;

  if (
    !(await hasPlatformPermission(session.realUserId, "manage_platform_users"))
  ) {
    return authJson({ error: "FORBIDDEN" }, 403);
  }

  try {
    const { id } = await context.params;
    const body = await readJsonObject(request);
    if (!body) return authJson({ error: "INVALID_BODY" }, 400);

    const eventId =
      "eventId" in body
        ? typeof body.eventId === "string" && body.eventId.trim()
          ? body.eventId.trim()
          : null
        : undefined;
    const role =
      typeof body.role === "string" && PORTAL_ROLES.includes(body.role as UserRole)
        ? (body.role as UserRole)
        : undefined;
    const name = typeof body.name === "string" ? body.name : undefined;
    const email = typeof body.email === "string" ? body.email : undefined;
    const password =
      typeof body.password === "string" && body.password.length > 0
        ? body.password
        : undefined;

    const result = await updateUserRoleOrEvent(
      id,
      { eventId, role, name, email, password },
      session.realUserId,
    );
    return authJson(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return authJson(
        { error: error.code, message: error.message },
        error.status,
      );
    }
    return authJson({ error: "Failed to update user" }, 500);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const session = await requireAdminSession(request);
  if (!isAuthSession(session)) return session;

  if (
    !(await hasPlatformPermission(session.realUserId, "manage_platform_users"))
  ) {
    return authJson({ error: "FORBIDDEN" }, 403);
  }

  try {
    const { id } = await context.params;
    const result = await deleteAdminUser(id, session.realUserId);
    return authJson(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return authJson(
        { error: error.code, message: error.message },
        error.status,
      );
    }
    return authJson({ error: "Failed to delete user" }, 502);
  }
}
