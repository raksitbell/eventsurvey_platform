import type { AuditActionKind } from "@/types/admin/activity";

const KNOWN_MODULES = [
  "event_setup",
  "user_management",
  "event_management",
  "registration_builder",
  "survey_builder",
  "dashboard",
] as const;

export function translateActivityModule(
  moduleKey: string,
  t: (key: string) => string,
): string {
  if ((KNOWN_MODULES as readonly string[]).includes(moduleKey)) {
    return t(`modules.${moduleKey}`);
  }
  return moduleKey;
}

/** Client-side activity table search across user, event, module, and detail. */
export function matchesActivitySearch(
  item: {
    actorName: string;
    eventName: string | null;
    module: string;
    description: string;
    metadata: Record<string, unknown> | null;
  },
  query: string,
  options: {
    translateModule: (key: string) => string;
    formatMeta: (metadata: Record<string, unknown> | null) => string | null;
    platformLabel: string;
  },
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    item.actorName,
    item.eventName ?? options.platformLabel,
    item.module,
    options.translateModule(item.module),
    item.description,
    options.formatMeta(item.metadata) ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

export function formatActivityTime(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function actionBadgeClass(kind: AuditActionKind): string {
  if (kind === "create") {
    return "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400";
  }
  if (kind === "delete") {
    return "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400";
  }
  if (kind === "update") {
    return "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400";
  }
  return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
}

export type ActivityMetaTranslate = (
  key: string,
  values?: Record<string, string | number>,
) => string;

const KNOWN_FIELDS = [
  "email",
  "roleName",
  "slug",
  "count",
  "field",
  "event",
  "registrationForm",
  "surveyForm",
  "dashboard",
  "canViewSubmissions",
  "canManageSubmissions",
  "canExport",
  "canViewActivity",
  "canInspection",
  "status",
] as const;

function fieldLabel(key: string, t?: ActivityMetaTranslate): string {
  if (t && (KNOWN_FIELDS as readonly string[]).includes(key)) {
    return t(`meta.fields.${key}`);
  }
  return key;
}

function valueLabel(value: unknown, t?: ActivityMetaTranslate): string {
  if (typeof value === "boolean") {
    return t ? t(`meta.bool.${value ? "on" : "off"}`) : value ? "On" : "Off";
  }
  if (value == null) return t ? t("meta.empty") : "—";
  if (
    value === "can_edit" ||
    value === "view_only" ||
    value === "restricted"
  ) {
    return t ? t(`meta.levels.${value}`) : String(value);
  }
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  return String(value);
}

function formatObjectDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  t?: ActivityMetaTranslate,
): string[] {
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  const parts: string[] = [];
  for (const key of keys) {
    const from = before[key];
    const to = after[key];
    if (
      from &&
      to &&
      typeof from === "object" &&
      typeof to === "object" &&
      !Array.isArray(from) &&
      !Array.isArray(to)
    ) {
      parts.push(
        ...formatObjectDiff(
          from as Record<string, unknown>,
          to as Record<string, unknown>,
          t,
        ),
      );
      continue;
    }
    if (JSON.stringify(from) === JSON.stringify(to)) continue;
    const label = fieldLabel(key, t);
    const fromText = valueLabel(from, t);
    const toText = valueLabel(to, t);
    parts.push(
      t
        ? t("meta.change", { field: label, from: fromText, to: toText })
        : `${label}: ${fromText} → ${toText}`,
    );
  }
  return parts;
}

function formatScalarEntry(
  key: string,
  value: unknown,
  t?: ActivityMetaTranslate,
): string | null {
  if (value == null) return null;
  if (typeof value === "object") return null;

  if (key === "count" && typeof value === "number") {
    return t ? t("meta.count", { count: value }) : `${value} items`;
  }
  if (key === "email" && typeof value === "string") {
    return t ? t("meta.email", { value }) : `Email: ${value}`;
  }
  if (key === "roleName" && typeof value === "string") {
    return t ? t("meta.roleName", { value }) : `Role: ${value}`;
  }
  if (key === "slug" && typeof value === "string") {
    return t ? t("meta.slug", { value }) : `Slug: ${value}`;
  }
  if (key === "field" && typeof value === "string") {
    return t ? t("meta.field", { value }) : `Field: ${value}`;
  }

  const label = fieldLabel(key, t);
  const text = valueLabel(value, t);
  return t
    ? t("meta.pair", { field: label, value: text })
    : `${label}: ${text}`;
}

/**
 * Turn audit metadata into a short human-readable line (never raw JSON).
 */
export function formatMetadata(
  metadata: Record<string, unknown> | null,
  t?: ActivityMetaTranslate,
): string | null {
  if (!metadata) return null;

  const parts: string[] = [];
  const before = metadata.before;
  const after = metadata.after;

  if (
    before &&
    after &&
    typeof before === "object" &&
    typeof after === "object" &&
    !Array.isArray(before) &&
    !Array.isArray(after)
  ) {
    parts.push(
      ...formatObjectDiff(
        before as Record<string, unknown>,
        after as Record<string, unknown>,
        t,
      ),
    );
  } else {
    if (before != null && typeof before !== "object") {
      const text = formatScalarEntry("before", before, t);
      if (text) parts.push(text);
    }
    if (after != null && typeof after !== "object") {
      const text = formatScalarEntry("after", after, t);
      if (text) parts.push(text);
    }
  }

  for (const [key, value] of Object.entries(metadata)) {
    if (key === "before" || key === "after") continue;
    const text = formatScalarEntry(key, value, t);
    if (text) parts.push(text);
  }

  return parts.length ? parts.join(" · ") : null;
}
