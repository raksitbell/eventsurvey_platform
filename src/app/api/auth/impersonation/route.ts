import type { NextRequest } from "next/server";
import {
  authFailure,
  authJson,
  readJsonObject,
} from "@/core/auth/route-response";
import {
  issueVerifiedSession,
  verifiedAccount,
  verifiedImpersonationTarget,
} from "@/core/auth/verified-session";

export async function POST(request: NextRequest) {
  try {
    const { actor, session } = await verifiedAccount(request);
    if (session.effectiveUserId || actor.system_role !== "platform_admin") {
      return authJson({ error: "FORBIDDEN" }, 403);
    }

    const body = await readJsonObject(request);
    const userId = typeof body?.userId === "string" ? body.userId.trim() : "";
    if (!userId) return authJson({ error: "INVALID_TARGET" }, 400);

    const target = await verifiedImpersonationTarget(actor, userId);
    const response = authJson({ ok: true });
    issueVerifiedSession(response, actor.id, {
      effectiveUserId: target.id,
      expires: session.expires,
    });
    return response;
  } catch (error) {
    return authFailure(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { actor, session } = await verifiedAccount(request);
    if (actor.system_role !== "platform_admin") {
      return authJson({ error: "FORBIDDEN" }, 403);
    }

    const response = authJson({ ok: true });
    if (session.effectiveUserId) {
      issueVerifiedSession(response, actor.id, { expires: session.expires });
    }
    return response;
  } catch (error) {
    return authFailure(error);
  }
}
