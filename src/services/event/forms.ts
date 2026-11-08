import { mockApi, MockApiError } from "@/core/api/mock-client";
import { ServiceError } from "@/core/api/service-error";
import {
  assertFormStatusTransition,
  resolveAcceptingResponses,
} from "@/core/forms/lifecycle";
import { validatePublishReady } from "@/core/validation/forms";
import type {
  Choice,
  Form,
  FormCreateBody,
  FormRecord,
  FormStatus,
  FormStatusPatchInput,
  FormType,
  Label,
  Question,
  QuestionType,
} from "@/types/event/form";
import type {
  MockEvent,
  MockFieldOption,
  MockFieldOptionTranslation,
  MockFieldTranslation,
  MockFieldType,
  MockForm,
  MockFormField,
  MockFormStatus,
  MockFormTranslation,
} from "@/types/mock";

const CHOICE_TYPES = new Set<QuestionType>([
  "multiple_choice",
  "checkbox",
  "dropdown",
]);

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  return crypto.randomUUID();
}

/** UI choice types → mock `single_choice` / `multiple_choice`. */
export function toMockFieldType(type: QuestionType): MockFieldType {
  if (type === "multiple_choice") return "single_choice";
  if (type === "checkbox") return "multiple_choice";
  return type;
}

export function toQuestionType(type: MockFieldType): QuestionType {
  if (type === "single_choice") return "multiple_choice";
  if (type === "multiple_choice") return "checkbox";
  if (type === "email") return "short_text";
  return type;
}

function toUiFormStatus(status: MockFormStatus): FormStatus {
  switch (status) {
    case "open":
      return "published";
    case "scheduled":
      return "pending_approval";
    case "closed":
      return "closed";
    default:
      return "draft";
  }
}

function toMockFormStatus(status: FormStatus): MockFormStatus {
  switch (status) {
    case "published":
    case "paused":
      return "open";
    case "pending_approval":
    case "approved":
      return "scheduled";
    case "closed":
    case "archived":
    case "rejected":
      return "closed";
    default:
      return "draft";
  }
}

function unsetToNull(n: number): number | null {
  return n === 0 ? null : n;
}

function nullToNumber(n: number | null, fallback = 0): number {
  return n ?? fallback;
}

async function getLiveForm(id: string): Promise<MockForm> {
  let form: MockForm;
  try {
    form = await mockApi.get<MockForm>(`/forms/${id}`);
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    if (error instanceof MockApiError && error.status === 404) {
      throw new ServiceError("FORM_NOT_FOUND", 404);
    }
    throw error;
  }
  if (!form || form.deleted_at) {
    throw new ServiceError("FORM_NOT_FOUND", 404);
  }
  return form;
}

async function assertEventEditable(eventId: string): Promise<MockEvent> {
  let event: MockEvent;
  try {
    event = await mockApi.get<MockEvent>(`/events/${eventId}`);
  } catch (error) {
    if (error instanceof MockApiError && error.status === 404) {
      throw new ServiceError("EVENT_NOT_FOUND", 404);
    }
    throw error;
  }
  if (!event) {
    throw new ServiceError("EVENT_NOT_FOUND", 404);
  }
  if (event.start_at && new Date(event.start_at).getTime() <= Date.now()) {
    throw new ServiceError(
      "EVENT_ALREADY_STARTED",
      409,
      "Form definition cannot change after the event has started",
    );
  }
  return event;
}

async function assertUniqueLiveType(
  eventId: string,
  type: FormType,
  excludeFormId?: string,
): Promise<void> {
  const existing = await mockApi.get<MockForm[]>(
    `/forms?event_id=${encodeURIComponent(eventId)}&type=${encodeURIComponent(type)}`,
  );
  const conflict = existing.find(
    (row) => !row.deleted_at && row.id !== excludeFormId,
  );
  if (conflict) {
    throw new ServiceError(
      "FORM_TYPE_EXISTS",
      409,
      `A live ${type} form already exists for this event`,
    );
  }
}

async function loadFormTranslations(
  formId: string,
): Promise<MockFormTranslation[]> {
  return mockApi.get<MockFormTranslation[]>(
    `/form_translations?form_id=${encodeURIComponent(formId)}`,
  );
}

function emptyLabel(): Label {
  return {
    label: "",
    placeholder: "",
    choices: { en: [], th: [] },
  };
}

function buildLabelPair(
  enLabel: string,
  thLabel: string,
  enPlaceholder: string,
  thPlaceholder: string,
  enChoices: Choice[],
  thChoices: Choice[],
): { en: Label[]; th: Label[] } {
  return {
    en: [
      {
        label: enLabel,
        placeholder: enPlaceholder,
        choices: { en: enChoices, th: thChoices },
      },
    ],
    th: [
      {
        label: thLabel,
        placeholder: thPlaceholder,
        choices: { en: enChoices, th: thChoices },
      },
    ],
  };
}

/** Read options for a field into builder Choice lists (en + th). */
async function loadChoices(
  fieldId: string,
): Promise<{ en: Choice[]; th: Choice[] }> {
  const options = await mockApi.get<MockFieldOption[]>(
    `/field_options?field_id=${encodeURIComponent(fieldId)}&_sort=display_order&_order=asc`,
  );
  const live = options.filter((o) => !o.deleted_at);
  const en: Choice[] = [];
  const th: Choice[] = [];

  for (const option of live) {
    const translations = await mockApi.get<MockFieldOptionTranslation[]>(
      `/field_option_translations?option_id=${encodeURIComponent(option.id)}`,
    );
    const enRow = translations.find((t) => t.locale_code === "en");
    const thRow = translations.find((t) => t.locale_code === "th");
    en.push({
      id: option.id,
      label: enRow?.label ?? thRow?.label ?? "",
      display_order: option.display_order,
    });
    th.push({
      id: option.id,
      label: thRow?.label ?? enRow?.label ?? "",
      display_order: option.display_order,
    });
  }
  return { en, th };
}

async function loadQuestions(formId: string): Promise<Question[]> {
  const fields = await mockApi.get<MockFormField[]>(
    `/form_fields?form_id=${encodeURIComponent(formId)}&_sort=display_order&_order=asc`,
  );
  const live = fields.filter((f) => !f.deleted_at);
  const questions: Question[] = [];

  for (const field of live) {
    const translations = await mockApi.get<MockFieldTranslation[]>(
      `/field_translations?field_id=${encodeURIComponent(field.id)}`,
    );
    const enT = translations.find((t) => t.locale_code === "en");
    const thT = translations.find((t) => t.locale_code === "th");
    const type = toQuestionType(field.type);
    const choices = CHOICE_TYPES.has(type)
      ? await loadChoices(field.id)
      : { en: [] as Choice[], th: [] as Choice[] };

    questions.push({
      question: {
        id: field.id,
        type,
        display_order: field.display_order,
        min_number: nullToNumber(field.min_number, type === "rating" ? 1 : 0),
        max_number: nullToNumber(field.max_number, type === "rating" ? 5 : 0),
        min_length: nullToNumber(field.min_length),
        max_length: nullToNumber(field.max_length),
        required: field.is_required,
        label: buildLabelPair(
          enT?.label ?? "",
          thT?.label ?? "",
          enT?.placeholder ?? "",
          thT?.placeholder ?? "",
          choices.en,
          choices.th,
        ),
      },
    });
  }
  return questions;
}

function headFromTranslations(rows: MockFormTranslation[]): Form["head"] {
  const en = rows.find((r) => r.locale_code === "en");
  const th = rows.find((r) => r.locale_code === "th");
  return {
    en: {
      title: en?.title ?? "",
      description: en?.description ?? "",
    },
    th: {
      title: th?.title ?? "",
      description: th?.description ?? "",
    },
  };
}

async function toFormRecord(form: MockForm): Promise<FormRecord> {
  const [translationRows, questions] = await Promise.all([
    loadFormTranslations(form.id),
    loadQuestions(form.id),
  ]);
  const uiStatus = toUiFormStatus(form.status);
  return {
    id: form.id,
    eventId: form.event_id,
    type: form.type,
    status: uiStatus,
    opensAt: form.opens_at,
    closesAt: form.closes_at,
    acceptingResponses: form.status === "open",
    publishedAt: form.status === "open" ? form.updated_at : null,
    createdAt: form.created_at,
    updatedAt: form.updated_at,
    head: headFromTranslations(translationRows),
    questions,
  };
}

async function writeFormTranslations(
  formId: string,
  head: Form["head"],
  stamp: string,
): Promise<void> {
  const current = await loadFormTranslations(formId);
  const byLocale = new Map(current.map((row) => [row.locale_code, row]));

  for (const locale of ["th", "en"] as const) {
    const prev = byLocale.get(locale);
    const body = {
      form_id: formId,
      locale_code: locale,
      title: head[locale].title,
      description: head[locale].description || null,
      updated_at: stamp,
    };
    if (prev) {
      await mockApi.put(`/form_translations/${prev.id}`, {
        ...prev,
        ...body,
      });
      byLocale.delete(locale);
    } else {
      await mockApi.post("/form_translations", {
        id: newId(),
        ...body,
        created_at: stamp,
      });
    }
  }
  for (const leftover of byLocale.values()) {
    await mockApi.delete(`/form_translations/${leftover.id}`);
  }
}

async function softDeleteFieldTree(
  fieldId: string,
  stamp: string,
): Promise<void> {
  const options = await mockApi.get<MockFieldOption[]>(
    `/field_options?field_id=${encodeURIComponent(fieldId)}`,
  );
  for (const option of options) {
    if (!option.deleted_at) {
      await mockApi.patch(`/field_options/${option.id}`, {
        deleted_at: stamp,
      });
    }
  }
  await mockApi.patch(`/form_fields/${fieldId}`, {
    deleted_at: stamp,
    updated_at: stamp,
  });
}

/**
 * Builder keeps primary choice edits under `label.en[0].choices.en`.
 * Thai labels prefer matching id in `choices.th`, else same index.
 */
function resolveOptionLocales(enLabel: Label | undefined): {
  en: Choice[];
  th: Choice[];
} {
  const enChoices = enLabel?.choices.en ?? [];
  const thChoices = enLabel?.choices.th ?? [];
  const thById = new Map(thChoices.filter((c) => c.id).map((c) => [c.id!, c]));
  return {
    en: enChoices,
    th: enChoices.map((c, index) => {
      const byId = c.id ? thById.get(c.id) : undefined;
      const byIndex = thChoices[index];
      return {
        id: c.id,
        display_order: c.display_order,
        label: byId?.label || byIndex?.label || c.label,
      };
    }),
  };
}

function suppliedChoiceIds(question: Question["question"]): string[] {
  return [...question.label.en, ...question.label.th].flatMap((label) => [
    ...label.choices.en.flatMap((choice) => (choice.id ? [choice.id] : [])),
    ...label.choices.th.flatMap((choice) => (choice.id ? [choice.id] : [])),
  ]);
}

function assertNewQuestionTreeHasNoIds(questions: Question[]): void {
  for (const item of questions) {
    if (item.question.id) {
      throw new ServiceError(
        "INVALID_QUESTION_ID",
        400,
        "New questions must omit IDs so the server can generate them",
      );
    }
    if (suppliedChoiceIds(item.question).length > 0) {
      throw new ServiceError(
        "INVALID_OPTION_ID",
        400,
        "New questions cannot reference existing option IDs",
      );
    }
  }
}

/** Reject client IDs unless they already belong to this exact form tree. */
async function assertQuestionTreeOwnership(
  formId: string,
  questions: Question[],
  knownFields?: MockFormField[],
): Promise<MockFormField[]> {
  const existing =
    knownFields ??
    (await mockApi.get<MockFormField[]>(
      `/form_fields?form_id=${encodeURIComponent(formId)}`,
    ));
  const liveFields = new Map(
    existing
      .filter((field) => !field.deleted_at)
      .map((field) => [field.id, field]),
  );
  const seenFieldIds = new Set<string>();

  for (const item of questions) {
    const question = item.question;
    const choiceIds = suppliedChoiceIds(question);

    if (!question.id) {
      if (choiceIds.length > 0) {
        throw new ServiceError(
          "INVALID_OPTION_ID",
          400,
          "New questions cannot reference existing option IDs",
        );
      }
      continue;
    }
    if (seenFieldIds.has(question.id)) {
      throw new ServiceError(
        "DUPLICATE_QUESTION_ID",
        400,
        "A question ID may only appear once",
      );
    }
    seenFieldIds.add(question.id);

    if (!liveFields.has(question.id)) {
      throw new ServiceError(
        "QUESTION_NOT_OWNED_BY_FORM",
        400,
        "Question ID does not belong to this form",
      );
    }

    const options = await mockApi.get<MockFieldOption[]>(
      `/field_options?field_id=${encodeURIComponent(question.id)}`,
    );
    const liveOptionIds = new Set(
      options.filter((option) => !option.deleted_at).map((option) => option.id),
    );
    const seenOptionIds = new Set<string>();
    for (const optionId of choiceIds) {
      if (seenOptionIds.has(optionId)) continue;
      seenOptionIds.add(optionId);
      if (!liveOptionIds.has(optionId)) {
        throw new ServiceError(
          "OPTION_NOT_OWNED_BY_QUESTION",
          400,
          "Option ID does not belong to this question",
        );
      }
    }
  }

  return existing;
}

async function replaceQuestionTree(
  formId: string,
  questions: Question[],
  stamp: string,
  knownFields?: MockFormField[],
): Promise<void> {
  const existing =
    knownFields ??
    (await mockApi.get<MockFormField[]>(
      `/form_fields?form_id=${encodeURIComponent(formId)}`,
    ));
  const keepIds = new Set(
    questions
      .map((q) => q.question.id)
      .filter((id): id is string => Boolean(id)),
  );

  for (const field of existing) {
    if (!field.deleted_at && !keepIds.has(field.id)) {
      await softDeleteFieldTree(field.id, stamp);
    }
  }

  for (const item of questions) {
    const q = item.question;
    const mockType = toMockFieldType(q.type);
    const fieldId = q.id ?? newId();
    const enLabel = q.label.en[0] ?? emptyLabel();
    const thLabel = q.label.th[0] ?? emptyLabel();

    const isRating = mockType === "rating";
    const fieldBody: MockFormField = {
      id: fieldId,
      form_id: formId,
      type: mockType,
      display_order: q.display_order,
      is_required: q.required,
      min_number: isRating ? null : unsetToNull(q.min_number),
      max_number: isRating ? null : unsetToNull(q.max_number),
      min_length: unsetToNull(q.min_length),
      max_length: unsetToNull(q.max_length),
      validation_pattern: null,
      rating_display: isRating ? "icon" : null,
      rating_icon: isRating ? "star" : null,
      rating_max: isRating ? (unsetToNull(q.max_number) ?? 5) : null,
      created_at: stamp,
      updated_at: stamp,
      deleted_at: null,
    };

    const prev = existing.find((f) => f.id === fieldId);
    if (prev) {
      await mockApi.put(`/form_fields/${fieldId}`, {
        ...fieldBody,
        created_at: prev.created_at,
        rating_display: prev.rating_display ?? fieldBody.rating_display,
        rating_icon: prev.rating_icon ?? fieldBody.rating_icon,
        rating_max: prev.rating_max ?? fieldBody.rating_max,
        validation_pattern: prev.validation_pattern,
      });
      const oldTranslations = await mockApi.get<MockFieldTranslation[]>(
        `/field_translations?field_id=${encodeURIComponent(fieldId)}`,
      );
      for (const row of oldTranslations) {
        await mockApi.delete(`/field_translations/${row.id}`);
      }
    } else {
      await mockApi.post("/form_fields", fieldBody);
    }

    await mockApi.post("/field_translations", {
      id: newId(),
      field_id: fieldId,
      locale_code: "en",
      label: enLabel.label,
      placeholder: enLabel.placeholder || null,
    });
    await mockApi.post("/field_translations", {
      id: newId(),
      field_id: fieldId,
      locale_code: "th",
      label: thLabel.label,
      placeholder: thLabel.placeholder || null,
    });

    const existingOptions = await mockApi.get<MockFieldOption[]>(
      `/field_options?field_id=${encodeURIComponent(fieldId)}`,
    );

    if (!CHOICE_TYPES.has(q.type)) {
      for (const option of existingOptions) {
        if (!option.deleted_at) {
          await mockApi.patch(`/field_options/${option.id}`, {
            deleted_at: stamp,
          });
        }
      }
      continue;
    }

    const { en: enChoices, th: thChoices } = resolveOptionLocales(enLabel);
    const keepOptionIds = new Set(
      enChoices.map((c) => c.id).filter((id): id is string => Boolean(id)),
    );
    for (const option of existingOptions) {
      if (!option.deleted_at && !keepOptionIds.has(option.id)) {
        await mockApi.patch(`/field_options/${option.id}`, {
          deleted_at: stamp,
        });
      }
    }

    for (const [index, enChoice] of enChoices.entries()) {
      const optionId = enChoice.id ?? newId();
      const thChoice = thChoices[index];
      const prevOption = existingOptions.find((o) => o.id === optionId);
      const optionBody: MockFieldOption = {
        id: optionId,
        field_id: fieldId,
        display_order: enChoice.display_order,
        created_at: prevOption?.created_at ?? stamp,
        deleted_at: null,
      };
      if (prevOption) {
        await mockApi.put(`/field_options/${optionId}`, optionBody);
        const oldOptTranslations = await mockApi.get<
          MockFieldOptionTranslation[]
        >(
          `/field_option_translations?option_id=${encodeURIComponent(optionId)}`,
        );
        for (const row of oldOptTranslations) {
          await mockApi.delete(`/field_option_translations/${row.id}`);
        }
      } else {
        await mockApi.post("/field_options", optionBody);
      }
      await mockApi.post("/field_option_translations", {
        id: newId(),
        option_id: optionId,
        locale_code: "en",
        label: enChoice.label,
      });
      await mockApi.post("/field_option_translations", {
        id: newId(),
        option_id: optionId,
        locale_code: "th",
        label: thChoice?.label || enChoice.label,
      });
    }
  }
}

interface FormRelations {
  formTranslations: MockFormTranslation[];
  fields: MockFormField[];
  fieldTranslations: MockFieldTranslation[];
  options: MockFieldOption[];
  optionTranslations: MockFieldOptionTranslation[];
}

interface FormTreeSnapshot extends FormRelations {
  form: MockForm;
}

async function loadFormRelations(formId: string): Promise<FormRelations> {
  const [formTranslations, fields] = await Promise.all([
    loadFormTranslations(formId),
    mockApi.get<MockFormField[]>(
      `/form_fields?form_id=${encodeURIComponent(formId)}`,
    ),
  ]);
  const fieldBranches = await Promise.all(
    fields.map(async (field) => {
      const [fieldTranslations, options] = await Promise.all([
        mockApi.get<MockFieldTranslation[]>(
          `/field_translations?field_id=${encodeURIComponent(field.id)}`,
        ),
        mockApi.get<MockFieldOption[]>(
          `/field_options?field_id=${encodeURIComponent(field.id)}`,
        ),
      ]);
      const optionTranslations = (
        await Promise.all(
          options.map((option) =>
            mockApi.get<MockFieldOptionTranslation[]>(
              `/field_option_translations?option_id=${encodeURIComponent(option.id)}`,
            ),
          ),
        )
      ).flat();
      return { fieldTranslations, options, optionTranslations };
    }),
  );

  return {
    formTranslations,
    fields,
    fieldTranslations: fieldBranches.flatMap(
      (branch) => branch.fieldTranslations,
    ),
    options: fieldBranches.flatMap((branch) => branch.options),
    optionTranslations: fieldBranches.flatMap(
      (branch) => branch.optionTranslations,
    ),
  };
}

async function captureFormTree(form: MockForm): Promise<FormTreeSnapshot> {
  return { form, ...(await loadFormRelations(form.id)) };
}

type IdentifiedRow = { id: string };

async function deleteExtraRows<T extends IdentifiedRow>(
  endpoint: string,
  current: readonly T[],
  expected: readonly T[],
): Promise<void> {
  const expectedIds = new Set(expected.map((row) => row.id));
  for (const row of current) {
    if (!expectedIds.has(row.id)) {
      await mockApi.delete(`/${endpoint}/${row.id}`);
    }
  }
}

async function restoreRows<T extends IdentifiedRow>(
  endpoint: string,
  current: readonly T[],
  expected: readonly T[],
): Promise<void> {
  const currentIds = new Set(current.map((row) => row.id));
  for (const row of expected) {
    if (currentIds.has(row.id)) {
      await mockApi.put(`/${endpoint}/${row.id}`, row);
    } else {
      await mockApi.post(`/${endpoint}`, row);
    }
  }
}

/** Best-effort transaction compensation for the mock server's REST writes. */
async function restoreFormTree(snapshot: FormTreeSnapshot): Promise<void> {
  const current = await loadFormRelations(snapshot.form.id);

  await deleteExtraRows(
    "field_option_translations",
    current.optionTranslations,
    snapshot.optionTranslations,
  );
  await deleteExtraRows("field_options", current.options, snapshot.options);
  await deleteExtraRows(
    "field_translations",
    current.fieldTranslations,
    snapshot.fieldTranslations,
  );
  await deleteExtraRows("form_fields", current.fields, snapshot.fields);
  await deleteExtraRows(
    "form_translations",
    current.formTranslations,
    snapshot.formTranslations,
  );

  await mockApi.put(`/forms/${snapshot.form.id}`, snapshot.form);
  await restoreRows(
    "form_translations",
    current.formTranslations,
    snapshot.formTranslations,
  );
  await restoreRows("form_fields", current.fields, snapshot.fields);
  await restoreRows(
    "field_translations",
    current.fieldTranslations,
    snapshot.fieldTranslations,
  );
  await restoreRows("field_options", current.options, snapshot.options);
  await restoreRows(
    "field_option_translations",
    current.optionTranslations,
    snapshot.optionTranslations,
  );
}

async function cleanupCreatedForm(formId: string): Promise<void> {
  const current = await loadFormRelations(formId);
  for (const row of current.optionTranslations) {
    await mockApi.delete(`/field_option_translations/${row.id}`);
  }
  for (const row of current.options) {
    await mockApi.delete(`/field_options/${row.id}`);
  }
  for (const row of current.fieldTranslations) {
    await mockApi.delete(`/field_translations/${row.id}`);
  }
  for (const row of current.fields) {
    await mockApi.delete(`/form_fields/${row.id}`);
  }
  for (const row of current.formTranslations) {
    await mockApi.delete(`/form_translations/${row.id}`);
  }
  try {
    await mockApi.delete(`/forms/${formId}`);
  } catch (error) {
    if (!(error instanceof MockApiError && error.status === 404)) throw error;
  }
}

async function compensateOrThrow(
  operation: () => Promise<void>,
  originalError: unknown,
): Promise<never> {
  try {
    await operation();
  } catch {
    const message =
      originalError instanceof Error ? originalError.message : "Write failed";
    throw new ServiceError(
      "FORM_WRITE_INCOMPLETE",
      502,
      `${message}; automatic rollback also failed`,
    );
  }
  throw originalError;
}

export async function listForms(
  eventId: string,
  allowedTypes: readonly FormType[],
): Promise<FormRecord[]> {
  const forms = await mockApi.get<MockForm[]>(
    `/forms?event_id=${encodeURIComponent(eventId)}`,
  );
  const allowed = new Set(allowedTypes);
  const live = forms.filter((f) => !f.deleted_at && allowed.has(f.type));
  const items: FormRecord[] = [];
  for (const form of live) {
    items.push(await toFormRecord(form));
  }
  return items;
}

export async function getForm(id: string): Promise<FormRecord> {
  const form = await getLiveForm(id);
  return toFormRecord(form);
}

export async function createForm(
  input: FormCreateBody,
  userId: string,
): Promise<FormRecord> {
  await assertEventEditable(input.eventId);
  await assertUniqueLiveType(input.eventId, input.type);
  assertNewQuestionTreeHasNoIds(input.questions);

  const stamp = nowIso();
  const id = newId();
  const form: MockForm = {
    id,
    event_id: input.eventId,
    type: input.type,
    status: "draft",
    opens_at: null,
    closes_at: null,
    created_at: stamp,
    created_by: userId,
    updated_at: stamp,
    updated_by: userId,
    deleted_at: null,
  };

  try {
    await mockApi.post("/forms", form);
    await writeFormTranslations(id, input.head, stamp);
    if (input.questions.length) {
      await replaceQuestionTree(id, input.questions, stamp, []);
    }
    return await getForm(id);
  } catch (error) {
    return compensateOrThrow(() => cleanupCreatedForm(id), error);
  }
}

export async function updateForm(
  id: string,
  input: Form,
  userId: string,
): Promise<FormRecord> {
  const form = await getLiveForm(id);
  if (form.status !== "draft") {
    throw new ServiceError(
      "FORM_NOT_DRAFT",
      409,
      "Only draft forms can update their definition",
    );
  }
  await assertEventEditable(form.event_id);
  const fields = await assertQuestionTreeOwnership(id, input.questions);
  const snapshot = await captureFormTree(form);

  const stamp = nowIso();
  try {
    await mockApi.put(`/forms/${id}`, {
      ...form,
      updated_by: userId,
      updated_at: stamp,
    });
    await writeFormTranslations(id, input.head, stamp);
    await replaceQuestionTree(id, input.questions, stamp, fields);
    return await getForm(id);
  } catch (error) {
    return compensateOrThrow(() => restoreFormTree(snapshot), error);
  }
}

export async function updateFormStatus(
  id: string,
  patch: FormStatusPatchInput,
  userId: string,
): Promise<FormRecord> {
  const form = await getLiveForm(id);
  const stamp = nowIso();
  const currentUiStatus = toUiFormStatus(form.status);
  assertFormStatusTransition(currentUiStatus, patch.status);

  if (patch.status === "published") {
    const record = await toFormRecord(form);
    const publishError = validatePublishReady({
      head: record.head,
      questions: record.questions,
    });
    if (publishError) {
      throw new ServiceError("FORM_NOT_PUBLISHABLE", 400, publishError);
    }
  }

  resolveAcceptingResponses(
    currentUiStatus,
    patch.status,
    form.status === "open",
    patch.acceptingResponses,
  );
  const nextMockStatus = toMockFormStatus(patch.status);
  await mockApi.put(`/forms/${id}`, {
    ...form,
    status: nextMockStatus,
    opens_at: patch.opensAt !== undefined ? patch.opensAt : form.opens_at,
    closes_at: patch.closesAt !== undefined ? patch.closesAt : form.closes_at,
    updated_by: userId,
    updated_at: stamp,
  });
  return getForm(id);
}

export async function deleteForm(id: string, userId: string): Promise<void> {
  const form = await getLiveForm(id);
  const snapshot = await captureFormTree(form);
  const stamp = nowIso();

  try {
    for (const field of snapshot.fields) {
      if (!field.deleted_at) {
        await softDeleteFieldTree(field.id, stamp);
      }
    }

    await mockApi.put(`/forms/${id}`, {
      ...form,
      deleted_at: stamp,
      updated_by: userId,
      updated_at: stamp,
    });
  } catch (error) {
    await compensateOrThrow(() => restoreFormTree(snapshot), error);
  }
}
