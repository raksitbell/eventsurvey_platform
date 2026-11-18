import { NextResponse, type NextRequest } from "next/server";
import { requirePortalSession } from "@/core/auth/api-guard";
import { readAuthSession } from "@/core/auth/cookie";
import { projectUserPii } from "@/core/auth/pii";
import { authJson, rejectSession } from "@/core/auth/route-response";

export async function GET(request: NextRequest) {
  const auth = await requirePortalSession(readAuthSession(request));
  if (auth instanceof NextResponse) {
    return auth.status === 401 ? rejectSession(request) : auth;
  }

  return authJson({
    realUser: projectUserPii(auth.realAccount.user, true),
    impersonatedUser: auth.impersonatedUser
      ? projectUserPii(auth.impersonatedUser, false)
      : null,
  });
}
