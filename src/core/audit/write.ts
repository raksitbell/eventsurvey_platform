import { mockApi } from "@/core/api/mock-client";
import { randomUUID } from "node:crypto";
import { projectAuditMetadata } from "./metadata";

/** Stable keys stored in audit_logs.module — UI translates via i18n. */
export type AuditModuleKey =
  | "event_setup"
  | "user_management"
  | "event_management"
  | "registration_builder"
  | "survey_builder"
  | "dashboard";

export type AuditWriteInput = {
  actorUserId: string;
  eventId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  module: AuditModuleKey;
  descriptionTh: string;
  descriptionEn: string;
  metadata?: Record<string, unknown> | null;
  includesUnmaskedPii?: boolean;
  occurredAt?: string;
};

/**
 * Persist an audit row. Never throws — callers must not fail the primary action
 * if the mock audit store is unavailable.
 */
export async function writeAuditLog(input: AuditWriteInput): Promise<void> {
  try {
    await mockApi.post("/audit_logs", {
      id: randomUUID(),
      event_id: input.eventId?.trim() || null,
      actor_user_id: input.actorUserId,
      action: input.action,
      resource_type: input.resourceType,
      resource_id: input.resourceId ?? null,
      module: input.module,
      description_th: input.descriptionTh,
      description_en: input.descriptionEn,
      metadata: projectAuditMetadata(input.metadata),
      includes_unmasked_pii: input.includesUnmaskedPii === true,
      occurred_at: input.occurredAt ?? new Date().toISOString(),
    });
  } catch (error) {
    console.error("[audit] write failed:", error);
  }
}
