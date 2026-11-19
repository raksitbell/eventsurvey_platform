import { ServiceError } from "@/core/api/service-error";
import { authJson, rejectCrossOrigin } from "@/core/auth/route-response";
import {
  formatZodError,
  setupPasswordBodySchema,
} from "@/core/validation/setup-password";
import {
  getResetPasswordPreview,
  resetPasswordWithToken,
} from "@/services/auth/forgot-password";
import type { NextRequest } from "next/server";

type RouteContext = { params: Promise<{ token: string }> };

/** GET /api/auth/reset-password/[token] — public preview for reset links */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  try {
    const data = await getResetPasswordPreview(decodeURIComponent(token));
    return authJson(data);
  } catch (error) {
    if (error instanceof ServiceError) {
      return authJson({ error: error.code }, error.status);
    }
    return authJson({ error: "Failed to load reset link" }, 502);
  }
}

/** POST /api/auth/reset-password/[token] — set a new password */
export async function POST(request: NextRequest, context: RouteContext) {
  const rejected = rejectCrossOrigin(request);
  if (rejected) return rejected;
  const { token } = await context.params;

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
    await resetPasswordWithToken(
      decodeURIComponent(token),
      parsed.data.password,
    );
    return authJson({ ok: true });
  } catch (error) {
    if (error instanceof ServiceError) {
      return authJson({ error: error.code }, error.status);
    }
    return authJson({ error: "Failed to reset password" }, 502);
  }
}
