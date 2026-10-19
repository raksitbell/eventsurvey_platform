// noinspection ES6PreferShortImport
import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_SESSION_COOKIE,
  canEnterAdminArea,
  parseAuthSessionCookie,
} from "@/core";

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
