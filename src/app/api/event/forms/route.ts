import {
  denyUnlessEventFormManager,
  isAuthSession,
  requireEventSession,
  resolveEventFormAccess,
} from "@/core/auth/api-guard";
import { satisfiesAccessLevel } from "@/core/auth/event-permissions";
import { ServiceError } from "@/core/api/service-error";
import { createFormBodySchema, formatZodError } from "@/core/validation/forms";
import { createForm, listForms } from "@/services/event/forms";
import type { FormType } from "@/types/event/form";
import { NextRequest, NextResponse } from "next/server";

/** GET /api/event/forms?eventId= — list live forms for an event */
export async function GET(request: NextRequest) {
  const sessionOrDeny = await requireEventSession(request);
  if (!isAuthSession(sessionOrDeny)) return sessionOrDeny;

  const eventId = request.nextUrl.searchParams.get("eventId");
  if (!eventId) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        details: [{ path: "eventId", message: "Required" }],
      },
      { status: 400 },
    );
  }

  const resolved = await resolveEventFormAccess(
    sessionOrDeny.userId,
    eventId,
    sessionOrDeny,
  );
  if (!resolved.ok) return resolved.response;

  const canViewRegistration = satisfiesAccessLevel(
    resolved.access.registrationForm,
    "view_only",
  );
  const canViewSurvey = satisfiesAccessLevel(
    resolved.access.surveyForm,
    "view_only",
  );
  const allowedTypes: FormType[] = [];
  if (canViewRegistration) allowedTypes.push("registration");
  if (canViewSurvey) allowedTypes.push("survey");
  if (!allowedTypes.length) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  try {
    const data = await listForms(eventId, allowedTypes);
    return NextResponse.json({
      ...data,
      registrationFormAccess: resolved.access.registrationForm,
      surveyFormAccess: resolved.access.surveyForm,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json({ error: "Failed to list forms" }, { status: 502 });
  }
}

/** POST /api/event/forms — body = FormBuilder `Form` + `eventId` */
export async function POST(request: NextRequest) {
  const sessionOrDeny = await requireEventSession(request);
  if (!isAuthSession(sessionOrDeny)) return sessionOrDeny;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = createFormBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(formatZodError(parsed.error), { status: 400 });
  }

  const denied = await denyUnlessEventFormManager(
    sessionOrDeny.userId,
    parsed.data.type,
    parsed.data.eventId,
    sessionOrDeny,
  );
  if (denied) return denied;

  try {
    const data = await createForm(parsed.data, sessionOrDeny.userId);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status },
      );
    }
    const readOnly =
      error instanceof Error && /EROFS|read-only file system/i.test(error.message);
    const message = readOnly ? "Mock API is read-only" : "Failed to create form";
    return NextResponse.json(
      { error: readOnly ? "MOCK_READ_ONLY" : "MOCK_API_ERROR", message },
      { status: readOnly ? 503 : 502 },
    );
  }
}
