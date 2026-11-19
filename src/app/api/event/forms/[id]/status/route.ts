import {
  denyUnlessEventFormManager,
  isAuthSession,
  requireEventSession,
} from "@/core/auth/api-guard";
import { ServiceError } from "@/core/api/service-error";
import { formatZodError, formStatusPatchSchema } from "@/core/validation/forms";
import { getForm, updateFormStatus } from "@/services/event/forms";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

/** PATCH /api/event/forms/[id]/status — draft ↔ scheduled (open/closed via cron) */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const sessionOrDeny = await requireEventSession(request);
  if (!isAuthSession(sessionOrDeny)) return sessionOrDeny;

  const { id } = await context.params;

  let existing: Awaited<ReturnType<typeof getForm>>;
  try {
    existing = await getForm(id);
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json({ error: "Failed to load form" }, { status: 502 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = formStatusPatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(formatZodError(parsed.error), { status: 400 });
  }

  const denied = await denyUnlessEventFormManager(
    sessionOrDeny.userId,
    existing.type,
    existing.eventId,
    sessionOrDeny,
  );
  if (denied) return denied;

  try {
    const data = await updateFormStatus(
      id,
      {
        status: parsed.data.status,
        opensAt: parsed.data.opensAt,
        closesAt: parsed.data.closesAt,
      },
      sessionOrDeny.userId,
    );
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status },
      );
    }
    const readOnly =
      error instanceof Error && /EROFS|read-only file system/i.test(error.message);
    const message = readOnly ? "Mock API is read-only" : "Failed to update form status";
    return NextResponse.json(
      { error: readOnly ? "MOCK_READ_ONLY" : "MOCK_API_ERROR", message },
      { status: readOnly ? 503 : 502 },
    );
  }
}
