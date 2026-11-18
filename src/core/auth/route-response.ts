import { NextResponse, type NextRequest } from "next/server";
import { AUTH_SESSION_COOKIE, clearAuthSessionCookie } from "./cookie";

export function authJson<T>(body: T, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export function rejectSession(request: NextRequest) {
  const response = authJson({ error: "UNAUTHORIZED" }, 401);
  if (request.cookies.has(AUTH_SESSION_COOKIE)) {
    clearAuthSessionCookie(response);
  }
  return response;
}

export function rejectCrossOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin === null) return null;
  const host = request.headers.get("host") ?? request.nextUrl.host;
  const expectedOrigin = `${request.nextUrl.protocol}//${host}`;
  return origin === expectedOrigin
    ? null
    : authJson({ error: "FORBIDDEN" }, 403);
}

export async function readJsonObject(request: NextRequest) {
  const mediaType = request.headers.get("content-type")?.split(";")[0]?.trim();
  if (mediaType?.toLowerCase() !== "application/json") return null;
  const body: unknown = await request.json().catch(() => null);
  return typeof body === "object" && body !== null && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : null;
}
