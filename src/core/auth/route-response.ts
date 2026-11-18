import { NextResponse, type NextRequest } from "next/server";
import { VerifiedSessionError } from "@/core/auth/verified-session";

export function authJson<T>(body: T, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export function authFailure(error: unknown) {
  return error instanceof VerifiedSessionError
    ? authJson({ error: error.code }, error.status)
    : authJson({ error: "SESSION_UNAVAILABLE" }, 502);
}

export function acceptsJson(request: NextRequest) {
  const mediaType = request.headers.get("content-type")?.split(";")[0]?.trim();
  return mediaType?.toLowerCase() === "application/json";
}

export async function readJsonObject(request: NextRequest) {
  if (!acceptsJson(request)) return null;
  const body: unknown = await request.json().catch(() => null);
  return typeof body === "object" && body !== null && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : null;
}
