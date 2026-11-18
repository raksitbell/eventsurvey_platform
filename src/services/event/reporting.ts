import { mockApi, MockApiError } from "@/core/api/mock-client";
import { maskName } from "@/core/auth/pii";
import {
  isReportingChoiceField,
  isReportingFieldPrivate,
} from "@/core/event/dashboard-policy";
import { resolveEventTitle } from "@/core/mock/event-title";
import { getDashboardScope } from "@/services/event/dashboard-access";
import {
  getDashboardLayout,
  getLayoutWidgets,
} from "@/services/event/dashboard-layout";
import { restoreDeletedForm } from "@/services/event/forms";
import type { Locale } from "@/i18n/routing";
import type {
  MockAnswerOptionSelection,
  MockEventTranslation,
  MockFieldOption,
  MockFieldOptionTranslation,
  MockFieldTranslation,
  MockForm,
  MockFormField,
  MockFormSubmission,
  MockFormTranslation,
  MockSubmissionAnswer,
  MockUser,
} from "@/types/mock";
import type { ReportingData } from "@/types/event/reporting";

type ReportingField = MockFormField & { contains_pii?: boolean };
type ReportingSubmission = MockFormSubmission & { deleted_at?: string | null };

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

interface TrashEntry {
  item: Trash;
  form?: MockForm;
  persisted: boolean;
}

export class ReportingError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const q = encodeURIComponent;

async function loadOptionalTrash(eventId: string) {
  try {
    return await mockApi.get<Trash[]>(`/trash_items?event_id=${q(eventId)}`);
  } catch (error) {
    if (error instanceof MockApiError && error.status === 404) return [];
    throw error;
  }
}

function trashEntries(
  items: Trash[],
  forms: MockForm[],
  eventId: string,
): TrashEntry[] {
  const activeItems = items.filter(
    (item) => item.event_id === eventId && !item.restored_at,
  );
  const deniedFormIds = new Set(
    activeItems
      .filter((item) => item.resource_type === "form" && !item.restore_allowed)
      .map((item) => item.resource_id),
  );
  const formsById = new Map(forms.map((form) => [form.id, form]));
  const entries: TrashEntry[] = [];
  const listedFormIds = new Set<string>();

  for (const item of activeItems) {
    if (item.resource_type !== "form") {
      entries.push({ item, persisted: true });
      continue;
    }

    const form = formsById.get(item.resource_id);
    if (!form) continue;
    // A persisted entry for an earlier deletion cannot restore a newer one.
    if (
      form.deleted_at &&
      Date.parse(form.deleted_at) !== Date.parse(item.deleted_at)
    ) {
      continue;
    }
    if (listedFormIds.has(form.id)) continue;

    entries.push({
      form,
      persisted: true,
      item: { ...item, restore_allowed: !deniedFormIds.has(form.id) },
    });
    listedFormIds.add(form.id);
  }

  for (const form of forms) {
    if (!form.deleted_at || listedFormIds.has(form.id)) continue;
    entries.push({
      form,
      persisted: false,
      item: {
        id: `form:${encodeURIComponent(form.id)}:${form.deleted_at}`,
        event_id: eventId,
        resource_type: "form",
        resource_id: form.id,
        display_name: form.id,
        deleted_by_user_id: form.updated_by,
        deleted_at: form.deleted_at,
        restored_at: null,
        restore_allowed: !deniedFormIds.has(form.id),
      },
    });
  }

  return entries;
}

function trashExpiry(item: Trash) {
  return Date.parse(item.deleted_at) + 30 * 86400000;
}

function canRestoreTrash({ item, form }: TrashEntry, now = Date.now()) {
  return Boolean(form && item.restore_allowed && trashExpiry(item) > now);
}

function answerValue(
  answer: MockSubmissionAnswer,
  field: ReportingField,
  choices: string[],
): string {
  if (isReportingFieldPrivate(field)) return "••••";
  if (isReportingChoiceField(field.type)) {
    return choices.join(", ");
  }
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
  return String(
    answer.value_text ??
      answer.value_boolean ??
      answer.value_date ??
      answer.value_time ??
      "",
  );
}

export async function getReportingData(
  userId: string,
  locale: Locale,
): Promise<ReportingData> {
  const scope = await getDashboardScope(userId);
  if (!scope) throw new ReportingError(403, "Forbidden");

  const { event, canReadForm } = scope;
  const [eventTranslations, eventForms, trash, eventUsers, layout] =
    await Promise.all([
      mockApi.get<MockEventTranslation[]>(
        `/event_translations?event_id=${q(event.id)}`,
      ),
      mockApi.get<MockForm[]>(`/forms?event_id=${q(event.id)}`),
      loadOptionalTrash(event.id),
      mockApi.get<MockUser[]>(`/users?event_id=${q(event.id)}`),
      getDashboardLayout(event.id),
    ]);

  const allowedForms = eventForms.filter(
    (form) => form.event_id === event.id && canReadForm(form.type),
  );
  const forms = allowedForms.filter((form) => !form.deleted_at);
  const formIds = new Set(forms.map((form) => form.id));
  const activeEventFormIds = new Set(
    eventForms
      .filter((form) => form.event_id === event.id && !form.deleted_at)
      .map((form) => form.id),
  );
  const [formGroups, widgets] = await Promise.all([
    Promise.all(
      forms.map(async (form) => {
        const [translations, fields, submissions] = await Promise.all([
          mockApi.get<MockFormTranslation[]>(
            `/form_translations?form_id=${q(form.id)}`,
          ),
          mockApi.get<ReportingField[]>(`/form_fields?form_id=${q(form.id)}`),
          mockApi.get<ReportingSubmission[]>(
            `/form_submissions?form_id=${q(form.id)}`,
          ),
        ]);
        return {
          translations: translations.filter((row) => row.form_id === form.id),
          fields: fields.filter(
            (row) => row.form_id === form.id && !row.deleted_at,
          ),
          submissions: submissions.filter(
            (row) =>
              row.form_id === form.id &&
              row.status === "submitted" &&
              !row.deleted_at &&
              Number.isFinite(Date.parse(row.submitted_at)),
          ),
        };
      }),
    ),
    getLayoutWidgets(layout),
  ]);
  const formTranslations = formGroups.flatMap((group) => group.translations);
  const fields = formGroups.flatMap((group) => group.fields);
  const submissions = formGroups.flatMap((group) => group.submissions);
  const widgetFields = fields.filter(
    (field) => !isReportingFieldPrivate(field),
  );

  const choiceFieldIds = new Set(
    fields
      .filter((field) => isReportingChoiceField(field.type))
      .map((field) => field.id),
  );
  const [fieldGroups, answerGroups] = await Promise.all([
    Promise.all(
      fields.map(async (field) => {
        const [translations, options] = await Promise.all([
          mockApi.get<MockFieldTranslation[]>(
            `/field_translations?field_id=${q(field.id)}`,
          ),
          choiceFieldIds.has(field.id)
            ? mockApi.get<MockFieldOption[]>(
                `/field_options?field_id=${q(field.id)}`,
              )
            : Promise.resolve([]),
        ]);
        return {
          translations: translations.filter((row) => row.field_id === field.id),
          options: options.filter(
            (row) => row.field_id === field.id && !row.deleted_at,
          ),
        };
      }),
    ),
    Promise.all(
      submissions.map(async (submission) => {
        const rows = await mockApi.get<MockSubmissionAnswer[]>(
          `/submission_answers?submission_id=${q(submission.id)}`,
        );
        return rows.filter((row) => row.submission_id === submission.id);
      }),
    ),
  ]);
  const fieldTranslations = fieldGroups.flatMap((group) => group.translations);
  const options = fieldGroups.flatMap((group) => group.options);

  const [selectionGroups, optionTranslationGroups] = await Promise.all([
    Promise.all(
      answerGroups
        .flat()
        .filter((answer) => choiceFieldIds.has(answer.field_id))
        .map(async (answer) => {
          const rows = await mockApi.get<MockAnswerOptionSelection[]>(
            `/answer_option_selections?answer_id=${q(answer.id)}`,
          );
          return rows.filter((row) => row.answer_id === answer.id);
        }),
    ),
    Promise.all(
      options.map(async (option) => {
        const rows = await mockApi.get<MockFieldOptionTranslation[]>(
          `/field_option_translations?option_id=${q(option.id)}`,
        );
        return rows.filter((row) => row.option_id === option.id);
      }),
    ),
  ]);
  const selections = selectionGroups.flat();
  const optionTranslations = optionTranslationGroups.flat();
  const localized = <T extends { locale_code: string }>(rows: T[]) =>
    rows.find((row) => row.locale_code === locale) ??
    rows.find((row) => row.locale_code === event.default_locale) ??
    rows[0];
  const fieldLabel = (id: string) =>
    localized(fieldTranslations.filter((row) => row.field_id === id))?.label ??
    id;

  const responses = submissions
    .map((submission, index) => {
      const submissionFields = fields.filter(
        (field) => field.form_id === submission.form_id,
      );
      const answers = answerGroups[index]
        .filter((answer) =>
          submissionFields.some((field) => field.id === answer.field_id),
        )
        .map((answer) => {
          const field = submissionFields.find(
            (row) => row.id === answer.field_id,
          )!;
          const choiceIds = new Set(
            selections
              .filter((selection) => selection.answer_id === answer.id)
              .map((selection) => selection.option_id),
          );
          const choices = options
            .filter(
              (option) =>
                option.field_id === field.id && choiceIds.has(option.id),
            )
            .map((option) => ({
              id: option.id,
              label:
                localized(
                  optionTranslations.filter(
                    (row) => row.option_id === option.id,
                  ),
                )?.label ?? option.id,
            }));
          const hasValue =
            Boolean(
              answer.value_text ||
              answer.value_date ||
              answer.value_time ||
              choices.length,
            ) ||
            typeof answer.value_number === "number" ||
            typeof answer.value_boolean === "boolean";

          return {
            field,
            value: answerValue(
              answer,
              field,
              choices.map((option) => option.label),
            ),
            selectedOptions:
              choiceFieldIds.has(field.id) && !isReportingFieldPrivate(field)
                ? choices
                : undefined,
            hasValue,
          };
        });
      const name = answers.find(
        ({ field }) =>
          field.type === "short_text" && isReportingFieldPrivate(field),
      );
      const rating = answers.find(
        ({ field, value }) =>
          field.type === "rating" &&
          value !== "" &&
          !isReportingFieldPrivate(field),
      );

      return {
        id: submission.id,
        formId: submission.form_id,
        respondent: name?.value ?? submission.id.slice(0, 8),
        submittedAt: submission.submitted_at,
        complete: submissionFields
          .filter((field) => field.is_required)
          .every((field) =>
            answers.some(
              (answer) => answer.field.id === field.id && answer.hasValue,
            ),
          ),
        score: rating ? Number(rating.value) : null,
        answers: answers.map(({ field, value, selectedOptions }) => ({
          fieldId: field.id,
          label: fieldLabel(field.id),
          value,
          ...(selectedOptions ? { selectedOptions } : {}),
        })),
      };
    })
    .sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt));

  // Replacing a layout cannot remove widgets for an active form the actor
  // cannot read. Widgets with obsolete sources can still be removed.
  const canManage = widgets.every(
    (widget) =>
      !widget.source_form_id ||
      !activeEventFormIds.has(widget.source_form_id) ||
      formIds.has(widget.source_form_id),
  );

  return {
    eventId: event.id,
    eventName:
      resolveEventTitle(eventTranslations, event.id, locale) ?? event.slug,
    eventStartsAt:
      event.start_at && Number.isFinite(Date.parse(event.start_at))
        ? event.start_at
        : (responses.at(-1)?.submittedAt ?? null),
    eventEndsAt:
      event.end_at && Number.isFinite(Date.parse(event.end_at))
        ? event.end_at
        : (responses[0]?.submittedAt ?? null),
    canManage,
    forms: forms.map((form) => ({
      id: form.id,
      title:
        localized(formTranslations.filter((row) => row.form_id === form.id))
          ?.title ?? form.id,
      type: form.type,
      approved: ["scheduled", "open", "closed"].includes(form.status),
    })),
    responses,
    fields: widgetFields.map((field) => ({
      id: field.id,
      formId: field.form_id,
      label: fieldLabel(field.id),
      numeric: ["number", "rating"].includes(field.type),
    })),
    widgets: widgets.filter(
      (widget) =>
        (!widget.source_form_id || formIds.has(widget.source_form_id)) &&
        (!widget.source_field_id ||
          widgetFields.some(
            (field) =>
              field.id === widget.source_field_id &&
              field.form_id === widget.source_form_id,
          )),
    ),
    trash: await Promise.all(
      trashEntries(trash, allowedForms, event.id)
        .filter(({ item }) => Number.isFinite(trashExpiry(item)))
        .map(async (entry) => {
          const { item, form, persisted } = entry;
          let title = item.display_name;
          if (form && !persisted) {
            const translations = await mockApi.get<MockFormTranslation[]>(
              `/form_translations?form_id=${q(form.id)}`,
            );
            const translation = localized(
              translations.filter((row) => row.form_id === form.id),
            );
            title = translation?.title ?? title;
          }

          const deletedBy = eventUsers.find(
            (user) =>
              user.id === item.deleted_by_user_id && user.event_id === event.id,
          )?.display_name;
          return {
            id: item.id,
            name: item.resource_type === "form" ? title : "••••",
            type: item.resource_type,
            deletedBy: deletedBy ? maskName(deletedBy) : "—",
            expiresAt: new Date(trashExpiry(item)).toISOString(),
            canRestore: canRestoreTrash(entry),
          };
        }),
    ),
  };
}

export async function restoreTrash(
  userId: string,
  _locale: Locale,
  id: unknown,
) {
  if (typeof id !== "string") throw new ReportingError(400, "Invalid item");
  const scope = await getDashboardScope(userId);
  if (!scope) throw new ReportingError(403, "Forbidden");

  const { event, canReadForm } = scope;
  const [eventForms, items] = await Promise.all([
    mockApi.get<MockForm[]>(`/forms?event_id=${q(event.id)}`),
    loadOptionalTrash(event.id),
  ]);
  const allowedForms = eventForms.filter(
    (form) => form.event_id === event.id && canReadForm(form.type),
  );
  const entry = trashEntries(items, allowedForms, event.id).find(
    ({ item }) => item.id === id,
  );
  if (!entry?.form || !canRestoreTrash(entry)) {
    throw new ReportingError(403, "Restore not allowed");
  }

  const now = new Date().toISOString();
  await restoreDeletedForm(entry.form, userId, now);
  if (entry.persisted) {
    await mockApi.patch(`/trash_items/${q(entry.item.id)}`, {
      restored_at: now,
      restored_by_user_id: userId,
    });
  }
  return { ok: true };
}
