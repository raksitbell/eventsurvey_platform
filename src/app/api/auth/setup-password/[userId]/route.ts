import { ServiceError } from "@/core/api/service-error";
import { authJson, rejectCrossOrigin } from "@/core/auth/route-response";
import {
  formatZodError,
  setupPasswordBodySchema,
} from "@/core/validation/setup-password";
import {
  getSetupPasswordPreview,
  setPasswordForInvitedUser,
} from "@/services/auth/setup-password";
import type { NextRequest } from "next/server";

type RouteContext = { params: Promise<{ userId: string }> };

/** GET /api/auth/setup-password/[userId] — public preview for invited users */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { userId: token } = await context.params;
  try {
    const data = await getSetupPasswordPreview(token);
    return authJson(data);
  } catch (error) {
    if (error instanceof ServiceError) {
      return authJson({ error: error.code }, error.status);
    }
    return authJson({ error: "Failed to load invite" }, 502);
  }
}

/** POST /api/auth/setup-password/[userId] — set password and activate */
export async function POST(request: NextRequest, context: RouteContext) {
  const rejected = rejectCrossOrigin(request);
  if (rejected) return rejected;
  const { userId: token } = await context.params;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return authJson({ error: "INVALID_JSON" }, 400);
  }

  const parsed = setupPasswordBodySchema.safeParse(json);
  if (!parsed.success) {
    return authJson(formatZodError(parsed.error), 400);
  }

  try {
    await setPasswordForInvitedUser(token, parsed.data.password);
    return authJson({ ok: true });
  } catch (error) {
    if (error instanceof ServiceError) {
      return authJson({ error: error.code }, error.status);
    }
    return authJson({ error: "Failed to set password" }, 502);
  }
}
