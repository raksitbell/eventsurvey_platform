import { bindMockUserAccess } from "@/services/auth/access";
import { mockApi } from "@/core/api/mock-client";
import { getEventWorkspace } from "@/services/event/workspace";
import type { Locale } from "@/i18n/routing";
import type { MockForm, MockFormSubmission, MockUser } from "@/types/mock";
import type { DashboardWidget, ReportingData } from "@/types/event/reporting";

interface Translation {
  form_id: string;
  field_id: string;
  option_id: string;
  locale_code: string;
  title: string;
  label: string;
}
interface Field {
  id: string;
  form_id: string;
  type: string;
  contains_pii: boolean;
  is_required: boolean;
  deleted_at: string | null;
}
interface Answer {
  id: string;
  submission_id: string;
  field_id: string;
  value_text: string | null;
  value_number: number | null;
  value_boolean: boolean | null;
  value_date: string | null;
  value_time: string | null;
}
interface Trash {
  id: string;
  event_id: string;
  resource_type: string;
  resource_id: string;
  display_name: string;
  deleted_by_user_id: string;
  deleted_at: string;
  restored_at: string | null;
  restore_allowed: boolean;
}
export class ReportingError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function eventContext(userId: string, locale: Locale) {
  const workspace = await getEventWorkspace(userId, locale);
  if (!workspace) throw new ReportingError(403, "Forbidden");
  const user = await bindMockUserAccess(
    await mockApi.get<MockUser>(`/users/${encodeURIComponent(userId)}`),
  );
  return {
    ...workspace,
    user,
    canManage: Boolean(user.can_manage_dashboard),
  };
}
export async function getReportingData(
  userId: string,
  locale: Locale,
): Promise<ReportingData> {
  const ctx = await eventContext(userId, locale);
  const [
    allForms,
    translations,
    allFields,
    fieldTranslations,
    submissions,
    answers,
    selections,
    optionTranslations,
    trash,
    users,
    layouts,
  ] = await Promise.all([
    mockApi.get<MockForm[]>(
      `/forms?event_id=${encodeURIComponent(ctx.eventId)}`,
    ),
    mockApi.get<Translation[]>("/form_translations"),
    mockApi.get<Field[]>("/form_fields"),
    mockApi.get<Translation[]>("/field_translations"),
    mockApi.get<MockFormSubmission[]>("/form_submissions"),
    mockApi.get<Answer[]>("/submission_answers"),
    mockApi.get<{ answer_id: string; option_id: string }[]>(
      "/answer_option_selections",
    ),
    mockApi.get<Translation[]>("/field_option_translations"),
    mockApi.get<Trash[]>(
      `/trash_items?event_id=${encodeURIComponent(ctx.eventId)}`,
    ),
    mockApi.get<MockUser[]>(
      `/users?event_id=${encodeURIComponent(ctx.eventId)}`,
    ),
    mockApi.get<{ id: string; event_id: string }[]>(
      `/dashboard_layouts?event_id=${encodeURIComponent(ctx.eventId)}`,
    ),
  ]);
  const forms = allForms.filter(
    (f) => f.event_id === ctx.eventId && !f.deleted_at,
  );
  const formIds = new Set(forms.map((f) => f.id));
  const fields = allFields.filter(
    (f) => formIds.has(f.form_id) && !f.deleted_at,
  );
  const localized = (rows: Translation[]) =>
    rows.find((r) => r.locale_code === locale) ??
    rows.find((r) => r.locale_code === "th") ??
    rows[0];
  const fieldLabel = (id: string) =>
    localized(fieldTranslations.filter((t) => t.field_id === id))?.label ?? id;
  const active = submissions.filter(
    (s) => formIds.has(s.form_id) && s.status === "submitted" && !s.deleted_at,
  );
  const responses = active
    .map((s) => {
      const fs = fields.filter((f) => f.form_id === s.form_id);
      const rows = answers.filter(
        (a) => a.submission_id === s.id && fs.some((f) => f.id === a.field_id),
      );
      const values = rows.map((a) => {
        const field = fs.find((f) => f.id === a.field_id)!;
        const choices = selections
          .filter((o) => o.answer_id === a.id)
          .map(
            (o) =>
              localized(
                optionTranslations.filter((t) => t.option_id === o.option_id),
              )?.label ?? o.option_id,
          );
        const raw =
          a.value_text ??
          a.value_number ??
          a.value_boolean ??
          a.value_date ??
          a.value_time ??
          (choices.length ? choices.join(", ") : "");
        return {
          fieldId: a.field_id,
          label: fieldLabel(a.field_id),
          value:
            field.contains_pii && !ctx.user.can_view_unmasked_pii
              ? "••••"
              : String(raw),
        };
      });
      const hasAnswer = (field: Field) =>
        rows.some(
          (a) =>
            a.field_id === field.id &&
            ((a.value_text !== null && a.value_text !== "") ||
              a.value_number !== null ||
              a.value_boolean !== null ||
              !!a.value_date ||
              !!a.value_time ||
              selections.some((o) => o.answer_id === a.id)),
        );
      const nameField = fs.find(
        (f) => f.contains_pii && f.type === "short_text",
      );
      const rating = rows.find((a) =>
        fs.some(
          (f) => f.id === a.field_id && f.type === "rating" && !f.contains_pii,
        ),
      );
      return {
        id: s.id,
        formId: s.form_id,
        respondent:
          values.find((a) => a.fieldId === nameField?.id)?.value ||
          s.id.slice(0, 8),
        submittedAt: s.submitted_at,
        complete: fs.filter((f) => f.is_required).every(hasAnswer),
        score: rating?.value_number ?? null,
        answers: values,
      };
    })
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const layout = layouts.find((l) => l.event_id === ctx.eventId);
  const widgets = layout
    ? await mockApi.get<DashboardWidget[]>(
        `/dashboard_widgets?layout_id=${encodeURIComponent(layout.id)}`,
      )
    : [];
  return {
    eventId: ctx.eventId,
    eventName: ctx.eventName,
    canManage: ctx.canManage,
    forms: forms.map((f) => ({
      id: f.id,
      title:
        localized(translations.filter((t) => t.form_id === f.id))?.title ??
        f.id,
      type: f.type,
      approved: ["approved", "published", "paused", "closed"].includes(
        f.status,
      ),
    })),
    responses,
    fields: fields
      .filter((f) => !f.contains_pii)
      .map((f) => ({
        id: f.id,
        formId: f.form_id,
        label: fieldLabel(f.id),
        numeric: ["number", "rating"].includes(f.type),
      })),
    widgets: widgets
      .filter((w) => w.layout_id === layout?.id)
      .sort((a, b) => a.display_order - b.display_order),
    trash: trash
      .filter((t) => t.event_id === ctx.eventId && !t.restored_at)
      .map((t) => {
        const expiresAt = new Date(
          new Date(t.deleted_at).getTime() + 30 * 86400000,
        ).toISOString();
        const form = allForms.find((f) => f.id === t.resource_id);
        const allowed =
          form?.type === "survey"
            ? ctx.user.can_manage_survey_form
            : form?.type === "registration" &&
              ctx.user.can_manage_registration_form;
        return {
          id: t.id,
          name:
            t.resource_type === "submission" && !ctx.user.can_view_unmasked_pii
              ? "••••"
              : t.display_name,
          type: t.resource_type,
          deletedBy:
            users.find((u) => u.id === t.deleted_by_user_id)?.display_name ??
            "—",
          expiresAt,
          canRestore:
            !!allowed &&
            t.resource_type === "form" &&
            t.restore_allowed &&
            Date.parse(expiresAt) > Date.now(),
        };
      }),
  };
}
export async function restoreTrash(
  userId: string,
  locale: Locale,
  id: unknown,
) {
  if (typeof id !== "string") throw new ReportingError(400, "Invalid item");
  const data = await getReportingData(userId, locale);
  if (!data.trash.some((t) => t.id === id && t.canRestore))
    throw new ReportingError(403, "Restore not allowed");
  const item = await mockApi.get<Trash>(
    `/trash_items/${encodeURIComponent(id)}`,
  );
  const form = await mockApi.get<MockForm>(
    `/forms/${encodeURIComponent(item.resource_id)}`,
  );
  if (form.event_id !== data.eventId || item.event_id !== data.eventId)
    throw new ReportingError(403, "Forbidden");
  await mockApi.patch(`/forms/${encodeURIComponent(form.id)}`, {
    deleted_at: null,
    updated_at: new Date().toISOString(),
    updated_by_user_id: userId,
  });
  await mockApi.patch(`/trash_items/${encodeURIComponent(id)}`, {
    restored_at: new Date().toISOString(),
    restored_by_user_id: userId,
  });
  return { ok: true };
}
