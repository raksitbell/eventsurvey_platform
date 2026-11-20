import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { ServiceError } from "@/core/api/service-error";
import { setupRecordSchema, type SetupRecord } from "@/core/event/setup-state";
import type { EventSetupState } from "@/types/event/setup";
import type { FormType } from "@/types/event/form";
import type { MockEvent } from "@/types/mock";

const prefix = "v1";

function encryptionKey() {
  const secret = process.env.EVENT_SETUP_DATA_SECRET || process.env.AUTH_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new ServiceError("SETUP_STORAGE_UNAVAILABLE", 503);
  }
  return createHash("sha256").update("eventsurvey:event-setup\0").update(secret).digest();
}

export function encodeSetupRecord(eventId: string, setup: SetupRecord): string {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), nonce);
  cipher.setAAD(Buffer.from(eventId));
  const bytes = Buffer.concat([cipher.update(JSON.stringify(setup)), cipher.final()]);
  return [prefix, nonce.toString("base64url"), cipher.getAuthTag().toString("base64url"), bytes.toString("base64url")].join(".");
}

export function readSetupRecord(event: Pick<MockEvent, "id" | "setup"> | { setup?: undefined }): SetupRecord {
  if (event.setup == null) {
    return { revision: 0, draft: null, branding: {}, pendingMedia: {}, publication: null, whitelist: null };
  }
  if (typeof event.setup !== "string" || !("id" in event)) {
    throw new ServiceError("SETUP_STORAGE_UNAVAILABLE", 503);
  }
  const [version, nonce, tag, bytes, extra] = event.setup.split(".");
  if (version !== prefix || !nonce || !tag || !bytes || extra != null) {
    throw new ServiceError("SETUP_STORAGE_UNAVAILABLE", 503);
  }
  const authTag = Buffer.from(tag, "base64url");
  if (authTag.length !== 16) {
    throw new ServiceError("SETUP_STORAGE_UNAVAILABLE", 503);
  }
  try {
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(nonce, "base64url"), {
      authTagLength: 16,
    });
    decipher.setAAD(Buffer.from(event.id));
    decipher.setAuthTag(authTag);
    const json = Buffer.concat([decipher.update(Buffer.from(bytes, "base64url")), decipher.final()]);
    return setupRecordSchema.parse(JSON.parse(json.toString("utf8")));
  } catch {
    throw new ServiceError("SETUP_STORAGE_UNAVAILABLE", 503);
  }
}

export function readSetupState(event: Parameters<typeof readSetupRecord>[0], visible: readonly FormType[] = []): EventSetupState {
  const { revision, draft, branding, pendingMedia, publication, publishedBranding, recoveredPublication } = readSetupRecord(event);
  function formSummary(type: FormType) {
    const form = publication?.forms[type];
    return form && visible.includes(type) ? { id: form.id, closesAt: form.closesAt } : null;
  }
  return {
    revision, draft, branding, pendingMedia,
    publication: publication && {
      ...publication,
      forms: { registration: formSummary("registration"), survey: formSummary("survey") },
    },
    ...(publication && publishedBranding ? { publishedBranding } : {}),
    recoveredPublicationAt: recoveredPublication?.publishedAt,
  };
}
