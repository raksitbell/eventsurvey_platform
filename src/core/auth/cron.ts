import { NextRequest, NextResponse } from "next/server";

/**
 * Protect cron route handlers with `CRON_SECRET`.
 * Accepts `Authorization: Bearer <secret>` or `x-cron-secret: <secret>`.
 */
export function requireCronSecret(
  request: NextRequest,
): NextResponse | null {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) {
    return NextResponse.json(
      {
        error: "CRON_NOT_CONFIGURED",
        message: "Set CRON_SECRET in the server environment",
      },
      { status: 503 },
    );
  }

  const bearer = request.headers.get("authorization");
  const fromBearer =
    bearer?.toLowerCase().startsWith("bearer ")
      ? bearer.slice(7).trim()
      : null;
  const fromHeader = request.headers.get("x-cron-secret")?.trim() ?? null;
  const provided = fromBearer || fromHeader;

  if (!provided || provided !== expected) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  return null;
}
