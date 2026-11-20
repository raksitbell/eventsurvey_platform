import { isAuthSession, requireAdminSession } from "@/core/auth/api-guard";
import { authJson, readJsonObject } from "@/core/auth/route-response";
import { hasPlatformPermission } from "@/core/mock/access";
import { ServiceError } from "@/core/api/service-error";
import { routing, type Locale } from "@/i18n/routing";
import {
  createAdminUser,
  getBoundAdminUsers,
} from "@/services/admin/users";
import type { UserRole } from "@/types/user";
import type { NextRequest } from "next/server";

const PORTAL_ROLES: UserRole[] = ["super_admin", "event_owner", "sub_user"];

export async function GET(request: NextRequest) {
  const session = await requireAdminSession(request);
  if (!isAuthSession(session)) return session;

  if (
    !(await hasPlatformPermission(session.realUserId, "view_platform_users"))
  ) {
    return authJson({ error: "FORBIDDEN" }, 403);
  }

  try {
    const role = request.nextUrl.searchParams.get("role") ?? undefined;
    const requestedLocale = request.nextUrl.searchParams.get("locale");
    const locale = routing.locales.includes(requestedLocale as Locale)
      ? (requestedLocale as Locale)
      : routing.defaultLocale;
    const trialOnly = request.nextUrl.searchParams.get("trial") === "true";
    const data = await getBoundAdminUsers(role, locale, trialOnly);
    return authJson(data);
  } catch {
    return authJson({ error: "Failed to load users" }, 502);
  }
}

export async function POST(request: NextRequest) {
  const session = await requireAdminSession(request);
  if (!isAuthSession(session)) return session;

  if (
    !(await hasPlatformPermission(session.realUserId, "manage_platform_users"))
  ) {
    return authJson({ error: "FORBIDDEN" }, 403);
  }

  try {
    const body = await readJsonObject(request);
    if (!body) return authJson({ error: "INVALID_JSON" }, 400);
    if (body.isTrial !== undefined && typeof body.isTrial !== "boolean") {
      return authJson({ error: "INVALID_TRIAL_FLAG" }, 400);
    }

    const name = typeof body.name === "string" ? body.name : "";
    const email = typeof body.email === "string" ? body.email : "";
    const role =
      typeof body.role === "string" && PORTAL_ROLES.includes(body.role as UserRole)
        ? (body.role as UserRole)
        : null;
    if (!role) return authJson({ error: "INVALID_ROLE" }, 400);

    const eventId =
      typeof body.eventId === "string" && body.eventId.trim()
        ? body.eventId.trim()
        : null;
    const password = typeof body.password === "string" ? body.password : "";
    if (!password) {
      return authJson({ error: "PASSWORD_REQUIRED" }, 400);
    }

    const result = await createAdminUser(
      { name, email, role, eventId, password, isTrial: body.isTrial },
      session.realUserId,
    );
    return authJson(result, 201);
  } catch (error) {
    if (error instanceof ServiceError) {
      return authJson(
        { error: error.code, message: error.message },
        error.status,
      );
    }
    return authJson({ error: "Failed to create user" }, 502);
  }
}
