import { readAuthSession } from "@/core/auth/cookie";
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
 * Match a guarded area exactly, not by prefix. `startsWith("/admin")` also
 * swallows /administrator and `startsWith("/event")` swallows /events and
 * /eventual, which must fall through to the catch-all 404 instead.
 */
function isArea(pathname: string, area: string): boolean {
  return pathname === area || pathname.startsWith(`${area}/`);
}

/** Use the signed session for navigation before handlers verify live access. */
function authRedirect(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    isArea(pathname, "/error")
  ) {
    return null;
  }

  const session = readAuthSession(request);

  if (isArea(pathname, "/login")) {
    if (!session) return null;
    const home = getHomePathForRole(session.role);
    if (isArea(pathname, home)) return null;
    return NextResponse.redirect(new URL(home, request.url));
  }

  if (isArea(pathname, "/admin")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (!canEnterAdminArea(session.realRole, session.impersonating)) {
      return NextResponse.redirect(new URL("/error/403", request.url));
    }
    return null;
  }

  if (isArea(pathname, "/event")) {
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
  // next-intl rewrites the public display URL to /<locale>/participant/display.
  // Let that internal target through if Next invokes proxy again for the rewrite.
  if (
    routing.locales.some((locale) =>
      isArea(request.nextUrl.pathname, `/${locale}/participant/display`),
    )
  ) {
    return NextResponse.next();
  }
  const redirect = authRedirect(request);
  if (redirect) return redirect;
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api/|_next|_vercel|.*\\..*).*)"],
};
