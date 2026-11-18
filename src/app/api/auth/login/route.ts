import type { NextRequest } from "next/server";
import {
  authFailure,
  authJson,
  readJsonObject,
} from "@/core/auth/route-response";
import { issueVerifiedSession } from "@/core/auth/verified-session";
import { loginWithMockCredentials } from "@/services/auth/login";

export async function POST(request: NextRequest) {
  try {
    const body = await readJsonObject(request);
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return authJson({ error: "INVALID_CREDENTIALS" }, 400);
    }

    const result = await loginWithMockCredentials(email, password);
    if (!result.ok) {
      const status = result.error === "UNSUPPORTED_ROLE" ? 403 : 401;
      return authJson({ error: result.error }, status);
    }

    const response = authJson({ user: result.user });
    issueVerifiedSession(response, result.user.id);
    return response;
  } catch (error) {
    return authFailure(error);
  }
}
