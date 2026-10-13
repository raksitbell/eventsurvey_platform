import { denyUnlessAdmin } from "@/core/auth/api-guard";
import { getUserForImpersonation } from "@/services/admin/users";
import { isImpersonatableRole } from "@/core/auth";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const denied = denyUnlessAdmin(request);
  if (denied) return denied;

  try {
    const { id } = await context.params;
    const user = await getUserForImpersonation(id);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!isImpersonatableRole(user.role)) {
      return NextResponse.json(
        { error: "User cannot be impersonated" },
        { status: 403 },
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load user";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
