import { readAuthSession } from "@/core/auth/cookie";
import {
  canEnterAdminArea,
  canEnterEventArea,
  getHomePathForRole,
} from "@/core/auth/permissions";
import { isPublicEventPath } from "@/core/event/public-event-paths";
import { routing } from "@/i18n/routing";
import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";

const intlMiddleware = createMiddleware(routing);
const participantPreviewPath = "/preview/event";

/**
 * Match a guarded area exactly, not by prefix. `startsWith("/admin")` also
 * swallows /administrator and `startsWith("/event")` swallows /events and
 * /eventual, which must fall through to the catch-all 404 instead.
 */
function isArea(pathname: string, area: string): boolean {
  return pathname === area || pathname.startsWith(`${area}/`);
}

/** Use the signed session for navigation before handlers verify live access. */
function authRedirect(
  request: NextRequest,
  pathname: string,
): NextResponse | null {
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    isArea(pathname, "/error") ||
    isPublicEventPath(pathname)
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

  if (isArea(pathname, "/event") || pathname === participantPreviewPath) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (
      !canEnterEventArea(
        session.role,
        session.realRole,
        session.impersonating,
        session.inspectedEventId,
      )
    ) {
      return NextResponse.redirect(new URL("/error/403", request.url));
    }
    return null;
  }

  return null;
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const localePrefix = routing.locales.find((locale) =>
    isArea(pathname, `/${locale}`),
  );
  const canonicalPath = localePrefix
    ? pathname.slice(localePrefix.length + 1) || "/"
    : pathname;

  const redirect = authRedirect(request, canonicalPath);
  if (redirect) return redirect;

  // Let next-intl's localized participant rewrite finish without a second redirect.
  if (
    localePrefix &&
    (canonicalPath === participantPreviewPath ||
      isArea(canonicalPath, "/participant/display") ||
      isPublicEventPath(canonicalPath))
  ) {
    return NextResponse.next();
  }
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api/|_next|_vercel|.*\\..*).*)"],
};
