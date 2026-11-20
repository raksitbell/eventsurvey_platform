import { isAuthSession, requireAdminSession } from "@/core/auth/api-guard";
import { authJson, readJsonObject } from "@/core/auth/route-response";
import { hasPlatformPermission } from "@/core/mock/access";
import { ServiceError } from "@/core/api/service-error";
import { updatePlatformAccessFlags } from "@/services/admin/users";
import type { PlatformAccessMatrix } from "@/types/admin/users";
import type { ModuleAccessLevel } from "@/types/event/permissions";
import type { NextRequest } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

function isModuleLevel(value: unknown): value is ModuleAccessLevel {
  return value === "restricted" || value === "view_only" || value === "can_edit";
}

function parsePlatformMatrix(body: Record<string, unknown>): PlatformAccessMatrix | null {
  if (
    !isModuleLevel(body.overview) ||
    !isModuleLevel(body.events) ||
    !isModuleLevel(body.users) ||
    typeof body.canViewActivity !== "boolean" ||
    typeof body.canInspection !== "boolean" ||
    typeof body.canViewUnmaskedPii !== "boolean"
  ) {
    return null;
  }
  return {
    // Overview is view-only — coerce legacy can_edit payloads.
    overview: body.overview === "can_edit" ? "view_only" : body.overview,
    events: body.events,
    users: body.users,
    canViewActivity: body.canViewActivity,
    canInspection: body.canInspection,
    canViewUnmaskedPii: body.canViewUnmaskedPii,
  };
}

/** PATCH /api/admin/users/[id]/platform-access — set platform matrix */
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
    if (!body) return authJson({ error: "INVALID_JSON" }, 400);

    const matrix = parsePlatformMatrix(body);
    if (!matrix) return authJson({ error: "INVALID_MATRIX" }, 400);

    const updated = await updatePlatformAccessFlags(
      id,
      matrix,
      session.realUserId,
    );
    return authJson(updated);
  } catch (error) {
    if (error instanceof ServiceError) {
      return authJson(
        { error: error.code, message: error.message },
        error.status,
      );
    }
    return authJson({ error: "Failed to update platform access" }, 502);
  }
}
