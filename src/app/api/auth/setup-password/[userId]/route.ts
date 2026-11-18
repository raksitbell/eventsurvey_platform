import { ServiceError } from "@/core/api/service-error";
import {
  formatZodError,
  setupPasswordBodySchema,
} from "@/core/validation/setup-password";
import {
  getSetupPasswordPreview,
  setPasswordForInvitedUser,
} from "@/services/auth/setup-password";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = { params: Promise<{ userId: string }> };

/** GET /api/auth/setup-password/[userId] — public preview for invited users */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { userId } = await context.params;
  try {
    const data = await getSetupPasswordPreview(userId);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json({ error: "Failed to load invite" }, { status: 502 });
  }
}

/** POST /api/auth/setup-password/[userId] — set password and activate */
export async function POST(request: NextRequest, context: RouteContext) {
  const { userId } = await context.params;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = setupPasswordBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(formatZodError(parsed.error), { status: 400 });
  }

  try {
    await setPasswordForInvitedUser(userId, parsed.data.password);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: "Failed to set password" },
      { status: 502 },
    );
  }
}
