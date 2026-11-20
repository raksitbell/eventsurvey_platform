import type { NextRequest } from "next/server";
import { setAuthSessionCookie } from "@/core/auth/cookie";
import {
  authJson,
  readJsonObject,
  rejectCrossOrigin,
} from "@/core/auth/route-response";
import { loginWithMockCredentials } from "@/services/auth/login";

export async function POST(request: NextRequest) {
  const denied = rejectCrossOrigin(request);
  if (denied) return denied;

  const body = await readJsonObject(request);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password) {
    return authJson({ error: "INVALID_CREDENTIALS" }, 400);
  }

  try {
    const result = await loginWithMockCredentials(email, password);
    if (!result.ok) {
      const status = result.error === "UNSUPPORTED_ROLE" ? 403 : 401;
      return authJson({ error: result.error }, status);
    }

    const { user } = result;
    const response = authJson({ user });
    setAuthSessionCookie(response, {
      realUserId: user.id,
      userId: user.id,
      realRole: user.role,
      role: user.role,
      inspectedEventId: null,
    });
    return response;
  } catch {
    return authJson({ error: "SESSION_UNAVAILABLE" }, 503);
  }
}
