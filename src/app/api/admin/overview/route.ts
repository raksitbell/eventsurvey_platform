import { denyUnlessAdmin } from "@/core/auth/api-guard";
import { routing, type Locale } from "@/i18n/routing";
import { getBoundAdminOverview } from "@/services/admin/overview";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const denied = denyUnlessAdmin(request);
  if (denied) return denied;

  try {
    const requestedLocale = request.nextUrl.searchParams.get("locale");
    const locale = routing.locales.includes(requestedLocale as Locale)
      ? (requestedLocale as Locale)
      : routing.defaultLocale;
    const data = await getBoundAdminOverview(locale);
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load overview";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
