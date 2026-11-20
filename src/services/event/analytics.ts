import { mockApi, MockApiError } from "@/core/api/mock-client";
import { isLegacyImpersonation, type AuthSessionCookie } from "@/core/auth/cookie";
import {
  AnalyticsError,
  localDay,
  parseFilters,
} from "@/core/analytics/policy";
import {
  isReportingChoiceField,
  isReportingFieldPrivate,
} from "@/core/event/dashboard-policy";
import { getDashboardScope } from "@/services/event/dashboard-access";
import type { NextRequest } from "next/server";
import type {
  MockEventTranslation,
  MockForm,
  MockFormSubmission,
} from "@/types/mock";
import type {
  AnalyticsData,
  Answer,
  Dashboard,
  Field,
  Filters,
  Widget,
} from "@/types/event/analytics";
type Translation = {
  form_id?: string;
  field_id?: string;
  option_id?: string;
  locale_code: string;
  title?: string;
  label?: string;
};
type Option = { id: string; field_id: string; deleted_at: string | null };
type Selection = { answer_id: string; option_id: string };
const q = encodeURIComponent;
const timezone = "Asia/Bangkok";
type AnalyticsSubmission = MockFormSubmission & { deleted_at?: string | null };
async function scope(session: AuthSessionCookie) {
  const scoped = await getDashboardScope(session.userId, {
    inspectedEventId: session.inspectedEventId,
  });
  if (!scoped) throw new AnalyticsError(403, "FORBIDDEN");
  return {
    ...scoped,
    session,
    // Platform inspection keeps full manage; legacy impersonation stays read-only.
    manage: !isLegacyImpersonation(session) && scoped.canManageDashboard,
  };
}

async function requireLegacyStore<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof MockApiError && error.status === 404) {
      throw new AnalyticsError(503, "ANALYTICS_STORAGE_UNAVAILABLE");
    }
    throw error;
  }
}

async function audit(
  context: Awaited<ReturnType<typeof scope>>,
  action: string,
  filters: Filters,
  count: number,
) {
  await requireLegacyStore(() =>
    mockApi.post("/audit_logs", {
      id: crypto.randomUUID(),
      event_id: context.event.id,
      actor_user_id: context.session.realUserId,
      action,
      resource_type: "analytics",
      resource_id: context.event.id,
      description: JSON.stringify({
        effectiveUserId: context.session.userId,
        formId: filters.formId || null,
        from: filters.from,
        to: filters.to,
        locale: filters.locale,
        count,
      }),
      includes_unmasked_pii: filters.raw,
      occurred_at: new Date().toISOString(),
    }),
  );
}
export async function getAnalytics(
  request: NextRequest,
  session: AuthSessionCookie,
  action: "analytics.view" | `analytics.export.${"csv" | "pdf"}` =
    "analytics.view",
): Promise<AnalyticsData> {
  const context = await scope(session);
  const { event, canReadForm, canViewSubmissions, canExport } = context;
  if (action !== "analytics.view" && !canExport) {
    throw new AnalyticsError(403, "FORBIDDEN");
  }
  const filters = parseFilters(request.nextUrl.searchParams);
  if (filters.eventId && filters.eventId !== event.id)
    throw new AnalyticsError(403, "FORBIDDEN_EVENT");
  filters.eventId = event.id;
  if (filters.raw) throw new AnalyticsError(403, "RAW_PII_FORBIDDEN");
  const [allForms, eventTranslations, dashboards] = await Promise.all([
    mockApi.get<MockForm[]>(`/forms?event_id=${q(event.id)}`),
    mockApi.get<MockEventTranslation[]>(
      `/event_translations?event_id=${q(event.id)}`,
    ),
    requireLegacyStore(() =>
      mockApi.get<Dashboard[]>(`/dashboard_data?event_id=${q(event.id)}`),
    ),
  ]);
  const forms = allForms.filter(
    (f) => f.event_id === event.id && !f.deleted_at && canReadForm(f.type),
  );
  if (filters.formId && !forms.some((f) => f.id === filters.formId))
    throw new AnalyticsError(403, "FORBIDDEN_FORM");
  const selected = forms.filter(
    (f) => !filters.formId || f.id === filters.formId,
  );
  const [fieldGroups, submissionGroups, formTranslationGroups] =
    await Promise.all([
      Promise.all(
        selected.map((f) =>
          mockApi.get<Field[]>(`/form_fields?form_id=${q(f.id)}`),
        ),
      ),
      canViewSubmissions
        ? Promise.all(
            selected.map((f) =>
              mockApi.get<AnalyticsSubmission[]>(
                `/form_submissions?form_id=${q(f.id)}`,
              ),
            ),
          )
        : [],
      Promise.all(
        forms.map((f) =>
          mockApi.get<Translation[]>(`/form_translations?form_id=${q(f.id)}`),
        ),
      ),
    ]);
  const selectedIds = new Set(selected.map((f) => f.id));
  const fields = fieldGroups
    .flat()
    .filter((f) => selectedIds.has(f.form_id) && !f.deleted_at)
    .sort((a, b) => a.display_order - b.display_order);
  const submissions = submissionGroups
    .flat()
    .filter((s) => {
      if (
        !selectedIds.has(s.form_id) ||
        s.status !== "submitted" ||
        s.deleted_at ||
        !Number.isFinite(Date.parse(s.submitted_at))
      )
        return false;
      const day = localDay(s.submitted_at, timezone);
      return (
        (!filters.from || day >= filters.from) &&
        (!filters.to || day <= filters.to)
      );
    })
    .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));
  const [answerGroups, fieldTranslationGroups, optionGroups] =
    await Promise.all([
      Promise.all(
        submissions.map((s) =>
          mockApi.get<Answer[]>(`/submission_answers?submission_id=${q(s.id)}`),
        ),
      ),
      Promise.all(
        fields.map((f) =>
          mockApi.get<Translation[]>(`/field_translations?field_id=${q(f.id)}`),
        ),
      ),
      Promise.all(
        fields.map((f) =>
          mockApi.get<Option[]>(`/field_options?field_id=${q(f.id)}`),
        ),
      ),
    ]);
  const options = optionGroups
    .flat()
    .filter((o) => !o.deleted_at && fields.some((f) => f.id === o.field_id));
  const answers = answerGroups
    .flat()
    .filter((a) =>
      submissions.some(
        (s) =>
          s.id === a.submission_id &&
          fields.some((f) => f.id === a.field_id && f.form_id === s.form_id),
      ),
    );
  const [selectionGroups, optionTranslationGroups] = await Promise.all([
    Promise.all(
      answers.map((a) =>
        mockApi.get<Selection[]>(
          `/answer_option_selections?answer_id=${q(a.id)}`,
        ),
      ),
    ),
    Promise.all(
      options.map((o) =>
        mockApi.get<Translation[]>(
          `/field_option_translations?option_id=${q(o.id)}`,
        ),
      ),
    ),
  ]);
  const label = (translations: Translation[], fallback: string) => {
    const entry =
      translations.find((t) => t.locale_code === filters.locale) ||
      translations.find((t) => t.locale_code === event.default_locale) ||
      translations[0];
    return entry?.label || entry?.title || fallback;
  };
  const answerValue = (answer: Answer, field: Field) => {
    if (isReportingFieldPrivate(field)) return "••••";
    const chosen = selectionGroups
      .flat()
      .filter((s) => s.answer_id === answer.id)
      .map((s) =>
        options.find((o) => o.id === s.option_id && o.field_id === field.id),
      )
      .filter((o): o is Option => !!o);
    if (isReportingChoiceField(field.type))
      return chosen
        .map((o) =>
          label(
            optionTranslationGroups.flat().filter((t) => t.option_id === o.id),
            o.id,
          ),
        )
        .join("; ");
    if (field.type === "rating" || field.type === "number") {
      const value = answer.value_number;
      if (typeof value !== "number" || !Number.isFinite(value)) return "";
      if (
        field.type === "rating" &&
        (value < 0 || value > (field.rating_max ?? 10))
      ) {
        return "";
      }
      return String(value);
    }
    const value =
      answer.value_text ??
      answer.value_number ??
      answer.value_boolean ??
      answer.value_date ??
      answer.value_time ??
      "";
    if (typeof value === "boolean")
      return filters.locale === "th"
        ? value
          ? "ใช่"
          : "ไม่ใช่"
        : value
          ? "Yes"
          : "No";
    return String(value);
  };
  const rows = submissions.map((s) => ({
    id: s.id,
    formId: s.form_id,
    submittedAt: s.submitted_at,
    values: Object.fromEntries(
      fields
        .filter((f) => f.form_id === s.form_id)
        .map((f) => {
          const answer = answers.find(
            (a) => a.submission_id === s.id && a.field_id === f.id,
          );
          return [f.id, answer ? answerValue(answer, f) : ""];
        }),
    ),
  }));
  const allowedDashboards = dashboards
    .filter((d) => d.event_id === event.id && (d.is_visible || context.manage))
    .sort((a, b) => a.display_order - b.display_order);
  const widgetGroups = await Promise.all(
    allowedDashboards.map((d) =>
      mockApi.get<Widget[]>(`/dashboard_widgets?dashboard_data_id=${q(d.id)}`),
    ),
  );
  const widgets = widgetGroups
    .flat()
    .filter(
      (w) =>
        allowedDashboards.some((d) => d.id === w.dashboard_data_id) &&
        (!w.form_id || selectedIds.has(w.form_id)) &&
        (!w.field_id ||
          fields.some(
            (f) =>
              f.id === w.field_id &&
              f.form_id === w.form_id &&
              !isReportingFieldPrivate(f),
          )),
    )
    .sort((a, b) => a.display_order - b.display_order)
    .map((w) => {
      const relevant = rows.filter((r) => !w.form_id || r.formId === w.form_id);
      const numbers = w.field_id
        ? answers
            .filter(
              (a) =>
                a.field_id === w.field_id &&
                relevant.some((r) => r.id === a.submission_id) &&
                typeof a.value_number === "number",
            )
            .map((a) => a.value_number as number)
        : [];
      const counts = new Map<string, number>();
      if (w.field_id)
        for (const row of relevant) {
          const answer = answers.find(
            (a) => a.submission_id === row.id && a.field_id === w.field_id,
          );
          const chosen = answer
            ? selectionGroups
                .flat()
                .filter((s) => s.answer_id === answer.id)
                .map((s) =>
                  options.find(
                    (o) => o.id === s.option_id && o.field_id === w.field_id,
                  ),
                )
                .filter((o): o is Option => !!o)
            : [];
          const values = chosen.length
            ? chosen.map((o) =>
                label(
                  optionTranslationGroups
                    .flat()
                    .filter((t) => t.option_id === o.id),
                  o.id,
                ),
              )
            : [row.values[w.field_id]];
          for (const value of values)
            if (value) counts.set(value, (counts.get(value) || 0) + 1);
        }
      const value =
        w.config_json.metric === "submission_count"
          ? relevant.length
          : w.config_json.metric === "avg" && numbers.length
            ? numbers.reduce((a, b) => a + b, 0) / numbers.length
            : null;
      return {
        ...w,
        value,
        distribution: Array.from(counts, ([label, count]) => ({
          label,
          count,
        })),
      };
    });
  const days = new Map<string, number>();
  for (const s of submissions) {
    const day = localDay(s.submitted_at, timezone);
    days.set(day, (days.get(day) || 0) + 1);
  }
  // Audit is awaited: a failed write must not release sensitive data or exports.
  await audit(context, action, filters, rows.length);
  return {
    event: {
      id: event.id,
      title: label(eventTranslations, event.slug),
      timezone,
    },
    filters,
    forms: forms.map((f) => ({
      id: f.id,
      type: f.type,
      title: label(
        formTranslationGroups.flat().filter((t) => t.form_id === f.id),
        f.type,
      ),
    })),
    fields: fields.map((f) => ({
      id: f.id,
      formId: f.form_id,
      label: label(
        fieldTranslationGroups.flat().filter((t) => t.field_id === f.id),
        f.id,
      ),
      pii: isReportingFieldPrivate(f),
      type: f.type,
    })),
    rows,
    metrics: {
      total: rows.length,
      registrations: rows.filter(
        (r) => forms.find((f) => f.id === r.formId)?.type === "registration",
      ).length,
      surveys: rows.filter(
        (r) => forms.find((f) => f.id === r.formId)?.type === "survey",
      ).length,
    },
    trend: Array.from(days, ([day, count]) => ({ day, count })).sort((a, b) =>
      a.day.localeCompare(b.day),
    ),
    dashboards: allowedDashboards,
    widgets,
    permissions: { raw: false, manage: context.manage },
  };
}
export async function saveAnalyticsLayout(
  request: NextRequest,
  session: AuthSessionCookie,
) {
  const context = await scope(session);
  if (!context.manage) throw new AnalyticsError(403, "FORBIDDEN");
  const body = (await request.json()) as {
    id: string;
    columns: number;
    widgets: Widget[];
  };
  if (
    !body ||
    typeof body.id !== "string" ||
    ![1, 2, 3].includes(body.columns) ||
    !Array.isArray(body.widgets) ||
    body.widgets.length > 30
  )
    throw new AnalyticsError(400, "INVALID_LAYOUT");
  const dashboard = await requireLegacyStore(() =>
    mockApi.get<Dashboard>(`/dashboard_data/${q(body.id)}`),
  );
  if (dashboard.event_id !== context.event.id)
    throw new AnalyticsError(403, "FORBIDDEN");
  const originals = (
    await mockApi.get<Widget[]>(
      `/dashboard_widgets?dashboard_data_id=${q(dashboard.id)}`,
    )
  ).filter((widget) => widget.dashboard_data_id === dashboard.id);
  const forms = (
    await mockApi.get<MockForm[]>(`/forms?event_id=${q(context.event.id)}`)
  ).filter(
    (f) =>
      f.event_id === context.event.id &&
      !f.deleted_at &&
      context.canReadForm(f.type),
  );
  const fields = (
    await Promise.all(
      forms.map((f) => mockApi.get<Field[]>(`/form_fields?form_id=${q(f.id)}`)),
    )
  ).flat();
  const validSource = (w: Widget) =>
    (!w.form_id || forms.some((f) => f.id === w.form_id)) &&
    (!w.field_id ||
      fields.some(
        (f) =>
          f.id === w.field_id &&
          f.form_id === w.form_id &&
          !f.deleted_at &&
          !isReportingFieldPrivate(f),
      ));
  if (originals.some((w) => !validSource(w)))
    throw new AnalyticsError(403, "FORBIDDEN");
  if (new Set(body.widgets.map((w) => w?.id)).size !== body.widgets.length)
    throw new AnalyticsError(400, "INVALID_WIDGETS");
  const normalized = body.widgets.map((w) => {
    if (
      !w ||
      typeof w.id !== "string" ||
      typeof w.title_th !== "string" ||
      typeof w.title_en !== "string" ||
      !w.title_th.trim() ||
      !w.title_en.trim() ||
      w.title_th.length > 240 ||
      w.title_en.length > 240
    )
      throw new AnalyticsError(400, "INVALID_WIDGETS");
    const original = originals.find((o) => o.id === w.id);
    const candidate = { ...original, ...w };
    if (!validSource(candidate))
      throw new AnalyticsError(403, "FORBIDDEN_SOURCE");
    // Existing API widget types outside this editor may be reordered without altering their configuration.
    const supported = ["kpi", "bar_chart", "pie_chart", "data_table"];
    if (!supported.includes(candidate.type) || !candidate.config_json)
      throw new AnalyticsError(400, "INVALID_WIDGET");
    if (!original && !/^[0-9a-f-]{36}$/.test(w.id))
      throw new AnalyticsError(400, "INVALID_WIDGET_ID");
    if (
      candidate.type === "kpi" &&
      !["submission_count", "avg"].includes(candidate.config_json.metric || "")
    )
      throw new AnalyticsError(400, "INVALID_METRIC");
    if (
      candidate.config_json.metric === "avg" &&
      !fields.some(
        (f) =>
          f.id === candidate.field_id && ["number", "rating"].includes(f.type),
      )
    )
      throw new AnalyticsError(400, "INVALID_NUMERIC_FIELD");
    if (
      ["bar_chart", "pie_chart"].includes(candidate.type) &&
      !candidate.field_id &&
      candidate.config_json.source !== "whitelist_status_counts"
    )
      throw new AnalyticsError(400, "FIELD_REQUIRED");
    if (
      candidate.config_json.span !== undefined &&
      ![4, 6, 12].includes(candidate.config_json.span)
    )
      throw new AnalyticsError(400, "INVALID_WIDGET_WIDTH");
    return {
      id: w.id,
      dashboard_data_id: dashboard.id,
      type: candidate.type,
      title_th: w.title_th.trim(),
      title_en: w.title_en.trim(),
      form_id: candidate.form_id || null,
      field_id: candidate.field_id || null,
      config_json: {
        span: candidate.config_json.span || 6,
        ...(candidate.type === "kpi"
          ? { metric: candidate.config_json.metric }
          : candidate.type === "data_table"
            ? { mask_pii: true }
            : {
                source: candidate.config_json.source,
                chart: candidate.type === "pie_chart" ? "pie" : "bar",
              }),
      },
    };
  });
  for (const widget of normalized)
    if (!originals.some((w) => w.id === widget.id)) {
      const existing = await mockApi.get<Widget[]>(
        `/dashboard_widgets?id=${q(widget.id)}`,
      );
      if (existing.length) throw new AnalyticsError(409, "WIDGET_ID_CONFLICT");
    }
  await audit(
    context,
    "analytics.layout.update.requested",
    {
      eventId: context.event.id,
      formId: "",
      from: "",
      to: "",
      locale: "th",
      raw: false,
    },
    normalized.length,
  );
  for (const [i, widget] of normalized.entries()) {
    const payload = {
      ...widget,
      display_order: i + 1,
      updated_at: new Date().toISOString(),
    };
    if (originals.some((w) => w.id === widget.id))
      await mockApi.patch(`/dashboard_widgets/${q(widget.id)}`, payload);
    else
      await mockApi.post("/dashboard_widgets", {
        ...payload,
        created_at: new Date().toISOString(),
      });
  }
  for (const original of originals)
    if (!normalized.some((w) => w.id === original.id))
      await mockApi.delete(`/dashboard_widgets/${q(original.id)}`);
  await mockApi.patch(`/dashboard_data/${q(dashboard.id)}`, {
    layout_json: { ...dashboard.layout_json, columns: body.columns },
    updated_at: new Date().toISOString(),
  });
  return { ok: true };
}
