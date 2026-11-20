import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { getAuthSessionSecret } from "@/core/auth/cookie";
import { publicEventPath } from "@/core/event/public-event-paths";
import type { ParticipantFormKind } from "@/types/event/participant";
import type { RegistrationProof } from "@/types/event/public-event";

const claimsSchema = z.object({
  eventId: z.string().min(1).max(255),
  registrationFormId: z.string().min(1).max(255),
  submissionId: z.string().min(1).max(255),
  expiresAt: z.number().int().positive(),
});

// Events without a closing date retain proof across browser restarts.
const defaultLifetimeMs = 365 * 24 * 60 * 60 * 1000;

function sign(domain: string, value: string) {
  const secret = getAuthSessionSecret();
  if (!secret) throw new Error("AUTH_SESSION_SECRET is missing or too short");
  return createHmac("sha256", secret).update("eventsurvey:participant:").update(domain).update(":").update(value);
}

export function registrationCookieName(slug: string) {
  return `es_registration_${slug}`;
}

export function issueRegistrationCookie(slug: string, proof: RegistrationProof, closesAt?: string | null) {
  const end = closesAt ? Date.parse(closesAt) : NaN;
  const expiresAt = Number.isFinite(end) ? end : Date.now() + defaultLifetimeMs;
  const claims = claimsSchema.parse({ ...proof, expiresAt });
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = sign("registration-v1", `${slug}.${payload}`).digest("base64url");
  return {
    name: registrationCookieName(slug),
    value: `${payload}.${signature}`,
    path: publicEventPath(slug),
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    expires: new Date(expiresAt),
  };
}

export function readRegistrationProof(slug: string, token?: string, now = Date.now()): RegistrationProof | undefined {
  if (!token || token.length > 3500 || !getAuthSessionSecret()) return;
  const parts = token.split(".");
  if (parts.length !== 2) return;
  const [payload, signature] = parts;
  const expected = Buffer.from(sign("registration-v1", `${slug}.${payload}`).digest("base64url"));
  const supplied = Buffer.from(signature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return;
  try {
    const parsed = claimsSchema.safeParse(JSON.parse(Buffer.from(payload, "base64url").toString("utf8")));
    if (!parsed.success || parsed.data.expiresAt <= now) return;
    const { eventId, registrationFormId, submissionId } = parsed.data;
    return { eventId, registrationFormId, submissionId };
  } catch {
    return;
  }
}

// Only a browser holding the original random request ID can retry and recover its receipt.
export function submissionRequestKey(slug: string, kind: ParticipantFormKind, requestId: string) {
  return sign("submission-v1", JSON.stringify([slug, kind, requestId])).digest("hex");
}
