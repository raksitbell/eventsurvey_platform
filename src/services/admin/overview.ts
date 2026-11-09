import { mockApi } from "@/core/api/mock-client";
import { resolveEventTitle } from "@/core/mock/event-title";
import { routing, type Locale } from "@/i18n/routing";
import {
  assertCoreDataAvailable,
  forecastSeries,
  pickTopEvents,
} from "@/services/admin/overview-helpers";
import type {
  AdminOverviewResponse,
  EventStatusKey,
  HealthStatus,
} from "@/types/admin/overview";
import type {
  MockApprovalRequest,
  MockAuditLog,
  MockEvent,
  MockEventTranslation,
  MockForm,
  MockFormSubmission,
  MockUser,
} from "@/types/mock";

const HISTORY_MONTHS = 6;
const FORECAST_MONTHS = 3;
const RECENT_ACTIVITY_LIMIT = 8;
const TOP_EVENTS_LIMIT = 5;
const PII_ACTIVITY_LIMIT = 8;
const FORM_APPROVAL_TARGETS = new Set(["registration_form", "survey_form"]);

const EVENT_STATUS_ORDER: EventStatusKey[] = [
  "open",
  "scheduled",
  "draft",
  "closed",
];

function monthKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function addUtcMonths(date: Date, months: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1),
  );
}

function buildMonthCategories(now: Date, count: number): string[] {
  const start = addUtcMonths(
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    -(count - 1),
  );
  return Array.from({ length: count }, (_, index) =>
    monthKey(addUtcMonths(start, index)),
  );
}

function countByMonth(timestamps: string[], categories: string[]): number[] {
  const counts = new Map(categories.map((key) => [key, 0]));
  for (const value of timestamps) {
    const key = monthKey(new Date(value));
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return categories.map((key) => counts.get(key) ?? 0);
}

function formSystemStatus(
  forms: MockForm[] | null,
  approvals: MockApprovalRequest[] | null,
): HealthStatus {
  if (!forms || !approvals) return "attention";

  const liveForms = forms.filter((form) => !form.deleted_at);
  const hasOpenForms = liveForms.some((form) => form.status === "open");
  const pendingFormApproval = approvals.some(
    (row) =>
      row.status === "pending" && FORM_APPROVAL_TARGETS.has(row.target_type),
  );

  return !hasOpenForms && pendingFormApproval ? "attention" : "operational";
}

function mapAuditRow(row: MockAuditLog) {
  return {
    id: row.id,
    action: row.action,
    description: row.description?.trim() || row.action,
    at: row.occurred_at,
    resourceType: row.resource_type,
  };
}

async function settleGet<T>(path: string): Promise<T | null> {
  try {
    return await mockApi.get<T>(path);
  } catch {
    return null;
  }
}

/**
 * Bind users + events + forms + submissions + audit for platform overview KPIs.
 *
 * Health checks (mock-era):
 * - coreApi: at least one mock resource responds
 * - database: all core tables (users/events/forms/submissions) readable
 * - formSystem: forms + approvals readable and no stuck/paused/pending-form issues
 */
export async function getBoundAdminOverview(
  locale: Locale = routing.defaultLocale,
): Promise<AdminOverviewResponse> {
  const [users, events, forms, submissions, auditLogs, approvals, translations] =
    await Promise.all([
      settleGet<MockUser[]>("/users"),
      settleGet<MockEvent[]>("/events"),
      settleGet<MockForm[]>("/forms"),
      settleGet<MockFormSubmission[]>("/form_submissions"),
      settleGet<MockAuditLog[]>("/audit_logs"),
      settleGet<MockApprovalRequest[]>("/approval_requests"),
      settleGet<MockEventTranslation[]>("/event_translations"),
    ]);

  const settled = [
    users,
    events,
    forms,
    submissions,
    auditLogs,
    approvals,
    translations,
  ];
  const coreTables = [users, events, forms, submissions];

  const coreApi: HealthStatus = settled.some((row) => row !== null)
    ? "operational"
    : "attention";
  const database: HealthStatus = coreTables.every((row) => row !== null)
    ? "operational"
    : "attention";
  const formSystem = formSystemStatus(forms, approvals);

  // Any missing core table → 502 via route catch (avoid quiet 200 with zero KPIs).
  assertCoreDataAvailable(coreTables);

  const liveEvents = (events ?? []).filter((event) => !event.deleted_at);
  const liveUsers = (users ?? []).filter((user) => !user.removed_at);
  const liveForms = (forms ?? []).filter((form) => !form.deleted_at);
  const liveRegistrationForms = liveForms.filter(
    (form) => form.type === "registration",
  );
  const liveSurveys = liveForms.filter((form) => form.type === "survey");
  const liveSubmissions = (submissions ?? []).filter(
    (row) => row.status === "submitted" && !row.deleted_at,
  );

  const formById = new Map(liveForms.map((form) => [form.id, form]));
  const responseCountByEvent = new Map<string, number>();
  for (const submission of liveSubmissions) {
    const form = formById.get(submission.form_id);
    if (!form) continue;
    responseCountByEvent.set(
      form.event_id,
      (responseCountByEvent.get(form.event_id) ?? 0) + 1,
    );
  }

  const translationRows = translations ?? [];
  const topEvents = pickTopEvents(
    liveEvents.map((event) => ({
      eventId: event.id,
      title:
        resolveEventTitle(translationRows, event.id, locale) ?? event.slug,
      responseCount: responseCountByEvent.get(event.id) ?? 0,
    })),
    TOP_EVENTS_LIMIT,
  );

  const statusCounts = new Map<EventStatusKey, number>(
    EVENT_STATUS_ORDER.map((status) => [status, 0]),
  );
  for (const event of liveEvents) {
    const status = event.status as EventStatusKey;
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
  }
  const eventStatusBreakdown = EVENT_STATUS_ORDER.map((status) => ({
    status,
    count: statusCounts.get(status) ?? 0,
  })).filter(
    (row) =>
      row.count > 0 ||
      row.status === "open" ||
      row.status === "draft" ||
      row.status === "closed",
  );

  const sortedAudit = [...(auditLogs ?? [])].sort(
    (a, b) =>
      new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
  );

  const recentActivity = sortedAudit
    .slice(0, RECENT_ACTIVITY_LIMIT)
    .map(mapAuditRow);

  const piiActivity = sortedAudit
    .filter((row) => row.includes_unmasked_pii)
    .slice(0, PII_ACTIVITY_LIMIT)
    .map(mapAuditRow);

  const now = new Date();
  const categories = buildMonthCategories(now, HISTORY_MONTHS);
  const forecastCategories = Array.from({ length: FORECAST_MONTHS }, (_, i) =>
    monthKey(
      addUtcMonths(
        new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
        i + 1,
      ),
    ),
  );

  const usersSeries = countByMonth(
    liveUsers.map((user) => user.created_at),
    categories,
  );
  const eventsSeries = countByMonth(
    liveEvents.map((event) => event.created_at),
    categories,
  );
  const responsesSeries = countByMonth(
    liveSubmissions.map((row) => row.submitted_at),
    categories,
  );

  return {
    metrics: {
      events: {
        active: liveEvents.filter((event) => event.status === "open").length,
        total: liveEvents.length,
      },
      users: {
        active: liveUsers.filter((user) => user.status === "active").length,
        total: liveUsers.length,
      },
      registrationForms: {
        active: liveRegistrationForms.filter((form) => form.status === "open")
          .length,
        total: liveRegistrationForms.length,
      },
      surveys: {
        active: liveSurveys.filter((form) => form.status === "open").length,
        total: liveSurveys.length,
      },
    },
    health: {
      coreApi,
      database,
      formSystem,
    },
    recentActivity,
    growth: {
      categories,
      series: {
        users: usersSeries,
        events: eventsSeries,
        responses: responsesSeries,
      },
      forecastCategories,
      forecast: {
        users: forecastSeries(usersSeries, FORECAST_MONTHS),
        events: forecastSeries(eventsSeries, FORECAST_MONTHS),
        responses: forecastSeries(responsesSeries, FORECAST_MONTHS),
      },
    },
    eventStatusBreakdown,
    topEvents,
    piiActivity,
  };
}
