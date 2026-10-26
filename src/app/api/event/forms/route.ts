import {
  denyUnlessEventFormManager,
  isAuthSession,
  requireEventSession,
} from "@/core/auth/api-guard";
import { ServiceError } from "@/core/api/service-error";
import {
  createFormBodySchema,
  formatZodError,
} from "@/core/validation/forms";
import { createForm, listForms } from "@/services/event/forms";
import { NextRequest, NextResponse } from "next/server";

/** GET /api/event/forms?eventId= — list live forms for an event */
export async function GET(request: NextRequest) {
  const sessionOrDeny = requireEventSession(request);
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

  const regDenied = await denyUnlessEventFormManager(
    sessionOrDeny.userId,
    "registration",
    eventId,
  );
  const surveyDenied = await denyUnlessEventFormManager(
    sessionOrDeny.userId,
    "survey",
    eventId,
  );
  if (regDenied && surveyDenied) {
    return regDenied;
  }

  try {
    const data = await listForms(eventId);
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list forms";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

/** POST /api/event/forms — body = FormBuilder `Form` + `eventId` */
export async function POST(request: NextRequest) {
  const sessionOrDeny = requireEventSession(request);
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
    const message =
      error instanceof Error ? error.message : "Failed to create form";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
