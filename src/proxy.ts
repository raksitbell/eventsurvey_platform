import {
  AUTH_SESSION_COOKIE,
  parseAuthSessionCookie,
} from "@/core/auth/cookie";
import {
  canEnterAdminArea,
  canEnterEventArea,
  getHomePathForRole,
} from "@/core/auth/permissions";
import { routing } from "@/i18n/routing";
import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";

const intlMiddleware = createMiddleware(routing);

/**
 * Gate /admin and /event before the App Router soft-navigates into those
 * layouts. Auth lives in localStorage; the client mirrors a small session
 * cookie so Edge middleware can redirect early (avoids 403-inside-/event hangs).
 */
function authRedirect(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/error")
  ) {
    return null;
  }

  const session = parseAuthSessionCookie(
    request.cookies.get(AUTH_SESSION_COOKIE)?.value,
  );

  if (pathname.startsWith("/login")) {
    if (!session) return null;
    const home = getHomePathForRole(session.role);
    return NextResponse.redirect(new URL(home, request.url));
  }

  if (pathname.startsWith("/admin")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (!canEnterAdminArea(session.realRole, session.impersonating)) {
      return NextResponse.redirect(new URL("/error/403", request.url));
    }
    return null;
  }

  if (pathname.startsWith("/event")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (
      !canEnterEventArea(
        session.role,
        session.realRole,
        session.impersonating,
      )
    ) {
      return NextResponse.redirect(new URL("/error/403", request.url));
    }
    return null;
  }

  return null;
}

export default function proxy(request: NextRequest) {
  const redirect = authRedirect(request);
  if (redirect) return redirect;
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api/|_next|_vercel|.*\\..*).*)"],
};
