import {
  denyUnlessEventFormManager,
  isAuthSession,
  requireEventSession,
} from "@/core/auth/api-guard";
import { ServiceError } from "@/core/api/service-error";
import {
  formatZodError,
  updateFormBodySchema,
} from "@/core/validation/forms";
import {
  deleteForm,
  getForm,
  updateForm,
} from "@/services/event/forms";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

async function authorizeForForm(
  userId: string,
  formId: string,
): Promise<
  | { ok: true; form: Awaited<ReturnType<typeof getForm>> }
  | { ok: false; response: NextResponse }
> {
  let form: Awaited<ReturnType<typeof getForm>>;
  try {
    form = await getForm(formId);
  } catch (error) {
    if (error instanceof ServiceError) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: error.code, message: error.message },
          { status: error.status },
        ),
      };
    }
    const message =
      error instanceof Error ? error.message : "Failed to load form";
    return {
      ok: false,
      response: NextResponse.json({ error: message }, { status: 502 }),
    };
  }

  const denied = await denyUnlessEventFormManager(
    userId,
    form.type,
    form.eventId,
  );
  if (denied) return { ok: false, response: denied };
  return { ok: true, form };
}

/** GET /api/event/forms/[id] — returns FormRecord (builder Form + meta) */
export async function GET(request: NextRequest, context: RouteContext) {
  const sessionOrDeny = requireEventSession(request);
  if (!isAuthSession(sessionOrDeny)) return sessionOrDeny;

  const { id } = await context.params;
  try {
    const auth = await authorizeForForm(sessionOrDeny.userId, id);
    if (!auth.ok) return auth.response;
    return NextResponse.json(auth.form);
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to load form";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

/** PUT /api/event/forms/[id] — body = FormBuilder `Form` */
export async function PUT(request: NextRequest, context: RouteContext) {
  const sessionOrDeny = requireEventSession(request);
  if (!isAuthSession(sessionOrDeny)) return sessionOrDeny;

  const { id } = await context.params;
  const auth = await authorizeForForm(sessionOrDeny.userId, id);
  if (!auth.ok) return auth.response;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = updateFormBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(formatZodError(parsed.error), { status: 400 });
  }

  try {
    const data = await updateForm(id, parsed.data, sessionOrDeny.userId);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to update form";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

/** DELETE /api/event/forms/[id] — soft-delete */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const sessionOrDeny = requireEventSession(request);
  if (!isAuthSession(sessionOrDeny)) return sessionOrDeny;

  const { id } = await context.params;
  const auth = await authorizeForForm(sessionOrDeny.userId, id);
  if (!auth.ok) return auth.response;

  try {
    await deleteForm(id, sessionOrDeny.userId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to delete form";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
