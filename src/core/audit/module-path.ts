import type { AuditModuleKey } from "@/core/audit/write";

const LEGACY_MODULE_ALIASES: Record<string, AuditModuleKey> = {
  "event setup": "event_setup",
  "user management": "user_management",
  "event management": "event_management",
  "registration builder": "registration_builder",
  "survey builder": "survey_builder",
  dashboard: "dashboard",
};

export function normalizeAuditModuleKey(module: string | null | undefined): string {
  const raw = module?.trim() || "";
  if (!raw) return "event_setup";
  const lower = raw.toLowerCase();
  if (LEGACY_MODULE_ALIASES[lower]) return LEGACY_MODULE_ALIASES[lower];
  if (lower.includes("registration")) return "registration_builder";
  if (lower.includes("survey")) return "survey_builder";
  if (lower.includes("user")) return "user_management";
  if (lower.includes("event management")) return "event_management";
  if (lower.includes("setup") || lower.includes("branding") || lower.includes("whitelist")) {
    return "event_setup";
  }
  if (lower.includes("dashboard") || lower.includes("analytics")) return "dashboard";
  return raw.includes("_") ? raw : lower.replace(/\s+/g, "_");
}

/**
 * Map audit module keys to portal paths.
 * Event-scoped modules require inspection (or already being in the event area).
 */
export function resolveActivityModulePath(
  module: string,
  options: { hasEvent: boolean } = { hasEvent: true },
): string | null {
  const key = normalizeAuditModuleKey(module);

  if (!options.hasEvent) {
    if (key === "user_management") return "/admin/users";
    if (key === "event_management") return "/admin/events";
    return "/admin";
  }

  switch (key) {
    case "registration_builder":
      return "/event/form/registration";
    case "survey_builder":
      return "/event/form/survey";
    case "user_management":
      return "/event/team";
    case "dashboard":
      return "/event/dashboard";
    case "event_setup":
    case "event_management":
      return "/event/details";
    default:
      return "/event";
  }
}
