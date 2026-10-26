import { mockApi, MockApiError } from "@/core/api/mock-client";
import { ServiceError } from "@/core/api/service-error";
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

/** UI `multiple_choice` → mock `radio`. */
export function toMockFieldType(type: QuestionType): MockFieldType {
  if (type === "multiple_choice") return "radio";
  return type;
}

export function toQuestionType(type: MockFieldType): QuestionType {
  if (type === "radio") return "multiple_choice";
  if (type === "number") return "short_text";
  return type;
}

function unsetToNull(n: number): number | null {
  return n === 0 ? null : n;
}

function nullToNumber(n: number | null, fallback = 0): number {
  return n ?? fallback;
}

async function getLiveForm(id: string): Promise<MockForm> {
  try {
    const form = await mockApi.get<MockForm>(`/forms/${id}`);
    if (!form || form.deleted_at) {
      throw new ServiceError("FORM_NOT_FOUND", 404);
    }
    return form;
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    if (error instanceof MockApiError && error.status === 404) {
      throw new ServiceError("FORM_NOT_FOUND", 404);
    }
    throw error;
  }
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
  if (!event || event.deleted_at) {
    throw new ServiceError("EVENT_NOT_FOUND", 404);
  }
  if (event.starts_at && new Date(event.starts_at).getTime() <= Date.now()) {
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

function headFromTranslations(
  rows: MockFormTranslation[],
): Form["head"] {
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
  return {
    id: form.id,
    eventId: form.event_id,
    type: form.type,
    status: form.status,
    opensAt: form.opens_at,
    closesAt: form.closes_at,
    acceptingResponses: form.accepting_responses,
    publishedAt: form.published_at,
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
  const thById = new Map(
    thChoices.filter((c) => c.id).map((c) => [c.id!, c]),
  );
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

async function replaceQuestionTree(
  formId: string,
  questions: Question[],
  stamp: string,
): Promise<void> {
  const existing = await mockApi.get<MockFormField[]>(
    `/form_fields?form_id=${encodeURIComponent(formId)}`,
  );
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

    const fieldBody: MockFormField = {
      id: fieldId,
      form_id: formId,
      type: mockType,
      display_order: q.display_order,
      is_required: q.required,
      contains_pii: false,
      min_number: unsetToNull(q.min_number),
      max_number: unsetToNull(q.max_number),
      min_length: unsetToNull(q.min_length),
      max_length: unsetToNull(q.max_length),
      validation_pattern: null,
      created_at: stamp,
      updated_at: stamp,
      deleted_at: null,
    };

    const prev = existing.find((f) => f.id === fieldId);
    if (prev) {
      await mockApi.put(`/form_fields/${fieldId}`, {
        ...fieldBody,
        created_at: prev.created_at,
        contains_pii: prev.contains_pii,
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

export async function listForms(eventId: string): Promise<FormRecord[]> {
  const forms = await mockApi.get<MockForm[]>(
    `/forms?event_id=${encodeURIComponent(eventId)}`,
  );
  const live = forms.filter((f) => !f.deleted_at);
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

  const stamp = nowIso();
  const id = newId();
  const form: MockForm = {
    id,
    event_id: input.eventId,
    type: input.type,
    status: "draft",
    opens_at: null,
    closes_at: null,
    accepting_responses: false,
    created_by_user_id: userId,
    updated_by_user_id: userId,
    published_at: null,
    created_at: stamp,
    updated_at: stamp,
    deleted_at: null,
  };

  await mockApi.post("/forms", form);
  await writeFormTranslations(id, input.head, stamp);
  if (input.questions.length) {
    await replaceQuestionTree(id, input.questions, stamp);
  }
  return getForm(id);
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

  const stamp = nowIso();
  await mockApi.put(`/forms/${id}`, {
    ...form,
    updated_by_user_id: userId,
    updated_at: stamp,
  });
  await writeFormTranslations(id, input.head, stamp);
  await replaceQuestionTree(id, input.questions, stamp);
  return getForm(id);
}

function resolveAccepting(
  status: FormStatus,
  explicit?: boolean,
): boolean {
  if (explicit !== undefined) return explicit;
  if (status === "published") return true;
  if (status === "paused" || status === "closed" || status === "archived") {
    return false;
  }
  return false;
}

export async function updateFormStatus(
  id: string,
  patch: FormStatusPatchInput,
  userId: string,
): Promise<FormRecord> {
  const form = await getLiveForm(id);
  const stamp = nowIso();

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

  const accepting = resolveAccepting(patch.status, patch.acceptingResponses);
  await mockApi.put(`/forms/${id}`, {
    ...form,
    status: patch.status,
    opens_at: patch.opensAt !== undefined ? patch.opensAt : form.opens_at,
    closes_at: patch.closesAt !== undefined ? patch.closesAt : form.closes_at,
    accepting_responses: accepting,
    published_at:
      patch.status === "published"
        ? (form.published_at ?? stamp)
        : form.published_at,
    updated_by_user_id: userId,
    updated_at: stamp,
  });
  return getForm(id);
}

export async function deleteForm(id: string, userId: string): Promise<void> {
  const form = await getLiveForm(id);
  const stamp = nowIso();

  const fields = await mockApi.get<MockFormField[]>(
    `/form_fields?form_id=${encodeURIComponent(id)}`,
  );
  for (const field of fields) {
    if (!field.deleted_at) {
      await softDeleteFieldTree(field.id, stamp);
    }
  }

  await mockApi.put(`/forms/${id}`, {
    ...form,
    deleted_at: stamp,
    updated_by_user_id: userId,
    updated_at: stamp,
    accepting_responses: false,
  });
}
