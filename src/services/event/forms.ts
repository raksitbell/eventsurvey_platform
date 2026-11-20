import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { mockApi, MockApiError } from "@/core/api/mock-client";
import { ServiceError } from "@/core/api/service-error";
import { writeAuditLog } from "@/core/audit/write";
import { isPastScheduleMinute } from "@/core/event/schedule";
import { readSetupRecord } from "@/core/event/setup-storage";
import { writeSerially } from "@/core/event/serial-write";
import {
  assertManualFormStatusTransition,
  formMutationFlags,
  nextCronFormStatus,
  registrationOutsideEvent,
  resolveEffectiveFormStatus,
} from "@/core/forms/lifecycle";
import {
  getPublishedForm,
  readPublishedForm,
  publishedFormDefinition,
  withPublishedFormSchedule,
} from "@/core/forms/published-schedule";
import { uniqueFieldIssue } from "@/core/forms/unique-field";
import { validatePublishReady } from "@/core/forms/content";
import type {
  Choice,
  Form,
  FormCreateBody,
  FormCronResult,
  FormListData,
  FormRecord,
  FormStatus,
  FormStatusPatchInput,
  FormType,
  ICON,
  Label,
  Question,
  QuestionType,
  RATING_DISPLAY,
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
  MockRatingDisplay,
  MockRatingIcon,
} from "@/types/mock";

const CHOICE_TYPES = new Set<QuestionType>([
  "multiple_choice",
  "checkbox",
  "dropdown",
]);

interface FormCacheStore {
  records: Map<string, FormRecord>;
  deletedIds: Set<string>;
  deletedAtById: Map<string, string>;
}

const CACHE_FILE_PATH = path.join(
  os.tmpdir(),
  "eventsurvey-forms-cache-v1.json",
);

const globalForForms = globalThis as unknown as {
  __esFormCacheStore?: FormCacheStore;
};

function getCacheStore(): FormCacheStore {
  if (!globalForForms.__esFormCacheStore) {
    globalForForms.__esFormCacheStore = {
      records: new Map<string, FormRecord>(),
      deletedIds: new Set<string>(),
      deletedAtById: new Map<string, string>(),
    };
  }
  const store = globalForForms.__esFormCacheStore;
  store.deletedAtById ??= new Map();
  try {
    if (fs.existsSync(CACHE_FILE_PATH)) {
      const raw = JSON.parse(fs.readFileSync(CACHE_FILE_PATH, "utf8")) as {
        records?: Record<string, FormRecord>;
        deletedIds?: string[];
        deletedAtById?: Record<string, string>;
      };
      if (Array.isArray(raw.deletedIds)) {
        for (const id of raw.deletedIds) {
          store.deletedIds.add(id);
          store.records.delete(id);
          const savedStamp = raw.deletedAtById?.[id];
          const currentStamp = store.deletedAtById.get(id);
          if (
            typeof savedStamp === "string" &&
            (!currentStamp || Date.parse(savedStamp) > Date.parse(currentStamp))
          ) {
            store.deletedAtById.set(id, savedStamp);
          }
        }
      }
      if (raw.records) {
        for (const [k, v] of Object.entries(raw.records)) {
          if (!store.deletedIds.has(k)) {
            store.records.set(k, v);
          }
        }
      }
    }
  } catch {
    // Ignore disk cache read errors
  }
  return store;
}

function persistCacheStore(store: FormCacheStore): void {
  try {
    const payload = {
      records: Object.fromEntries(store.records.entries()),
      deletedIds: Array.from(store.deletedIds.values()),
      deletedAtById: Object.fromEntries(store.deletedAtById.entries()),
    };
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(payload), "utf8");
  } catch {
    // Ignore disk cache write errors
  }
}

function saveCachedFormRecord(record: FormRecord): void {
  const store = getCacheStore();
  store.deletedIds.delete(record.id);
  store.deletedAtById.delete(record.id);
  store.records.set(record.id, record);
  persistCacheStore(store);
}

function markCachedFormDeleted(id: string, stamp: string): void {
  const store = getCacheStore();
  store.records.delete(id);
  store.deletedIds.add(id);
  store.deletedAtById.set(id, stamp);
  persistCacheStore(store);
}

function clearCachedFormDeletion(id: string): void {
  const store = getCacheStore();
  if (store.deletedIds.delete(id)) {
    store.deletedAtById.delete(id);
    persistCacheStore(store);
  }
}

function isCachedFormDeleted(form: MockForm): boolean {
  const store = getCacheStore();
  if (!store.deletedIds.has(form.id)) return false;
  const deletedAt = store.deletedAtById.get(form.id);
  // A live upstream record with a later update confirms a later write.
  // Older mock replicas and legacy unversioned tombstones remain hidden.
  if (deletedAt && Date.parse(form.updated_at) > Date.parse(deletedAt)) {
    clearCachedFormDeletion(form.id);
    return false;
  }
  return true;
}

function getCachedFormRecord(
  id: string,
  eventId?: string,
  type?: FormType,
): FormRecord | undefined {
  const store = getCacheStore();
  if (store.deletedIds.has(id)) return undefined;
  const direct = store.records.get(id);
  if (direct) return direct;
  if (eventId && type) {
    for (const rec of store.records.values()) {
      if (
        rec.eventId === eventId &&
        rec.type === type &&
        !store.deletedIds.has(rec.id)
      ) {
        return rec;
      }
    }
  }
  return undefined;
}

function getCachedFormsForEvent(
  eventId: string,
  allowed: Set<FormType>,
): FormRecord[] {
  const store = getCacheStore();
  const list: FormRecord[] = [];
  for (const rec of store.records.values()) {
    if (
      rec.eventId === eventId &&
      allowed.has(rec.type) &&
      !store.deletedIds.has(rec.id)
    ) {
      list.push(rec);
    }
  }
  return list;
}

async function putOrPost<T>(
  collectionPath: string,
  itemPath: string,
  body: unknown,
): Promise<T> {
  try {
    return await mockApi.put<T>(itemPath, body);
  } catch (error) {
    if (error instanceof MockApiError && error.status === 404) {
      return mockApi.post<T>(collectionPath, body);
    }
    throw error;
  }
}

async function patchIgnore404(itemPath: string, body: unknown): Promise<void> {
  try {
    await mockApi.patch(itemPath, body);
  } catch (error) {
    if (!(error instanceof MockApiError && error.status === 404)) {
      throw error;
    }
  }
}

async function deleteIgnore404(itemPath: string): Promise<void> {
  try {
    await mockApi.delete(itemPath);
  } catch (error) {
    if (!(error instanceof MockApiError && error.status === 404)) {
      throw error;
    }
  }
}

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
  return type;
}

function unsetToNull(n: number): number | null {
  return n === 0 ? null : n;
}

function nullToNumber(n: number | null, fallback = 0): number {
  return n ?? fallback;
}

async function getLiveForm(id: string): Promise<MockForm> {
  let form: MockForm | undefined;
  try {
    form = await mockApi.get<MockForm>(`/forms/${id}`);
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    if (!(error instanceof MockApiError && error.status === 404)) {
      throw error;
    }
  }
  if (!form) {
    const cached = getCachedFormRecord(id);
    if (cached) {
      return {
        id: cached.id,
        event_id: cached.eventId,
        type: cached.type,
        status: cached.status,
        opens_at: cached.opensAt ?? cached.opens_at ?? null,
        closes_at: cached.closesAt ?? cached.closes_at ?? null,
        created_at: cached.createdAt,
        created_by: "system",
        updated_at: cached.updatedAt,
        updated_by: "system",
        deleted_at: null,
      };
    }
    throw new ServiceError("FORM_NOT_FOUND", 404);
  }
  if (form.deleted_at || isCachedFormDeleted(form)) {
    throw new ServiceError("FORM_NOT_FOUND", 404);
  }
  return form;
}

async function loadEvent(eventId: string, { fresh = false } = {}): Promise<MockEvent> {
  let event: MockEvent;
  try {
    const resource = `/events/${eventId}`;
    event = fresh
      ? await mockApi.getFresh<MockEvent>(resource)
      : await mockApi.get<MockEvent>(resource);
  } catch (error) {
    if (error instanceof MockApiError && error.status === 404) {
      throw new ServiceError("EVENT_NOT_FOUND", 404);
    }
    throw error;
  }
  if (!event || event.id !== eventId || event.deleted_at) {
    throw new ServiceError("EVENT_NOT_FOUND", 404);
  }
  return event;
}

async function writeFormSerially<T>(
  id: string,
  operation: (form: MockForm, event: MockEvent) => Promise<T>,
) {
  const { event_id: eventId } = await getLiveForm(id);
  return writeSerially(eventId, async () => {
    const form = await getLiveForm(id);
    const event = await loadEvent(form.event_id, { fresh: true });
    return operation(form, event);
  });
}

function assertUnpublishedForm(
  form: MockForm,
  event: MockEvent,
  code: "FORM_NOT_EDITABLE" | "FORM_NOT_DELETABLE" | "FORM_STATUS_LOCKED",
) {
  if (getPublishedForm(event, form.type)?.id === form.id) {
    throw new ServiceError(code, 409, "Published event forms are read-only");
  }
}

function assertCanEdit(status: FormStatus): void {
  if (!formMutationFlags(status).canEdit) {
    throw new ServiceError(
      "FORM_NOT_EDITABLE",
      409,
      status === "draft"
        ? "Form cannot be edited"
        : "Only draft forms can be edited — revert from scheduled first",
    );
  }
}

function assertCanDelete(status: FormStatus): void {
  if (!formMutationFlags(status).canDelete) {
    throw new ServiceError(
      "FORM_NOT_DELETABLE",
      409,
      "Only draft forms can be deleted — revert from scheduled first",
    );
  }
}

function assertCanChangeStatus(status: FormStatus): void {
  if (!formMutationFlags(status).canChangeStatus) {
    throw new ServiceError(
      "FORM_STATUS_LOCKED",
      409,
      "open/closed forms cannot be changed manually — cron owns those transitions",
    );
  }
}

function assertFormSchedule(
  opensAt: string | null,
  closesAt: string | null,
  now: number,
  previous?: Pick<MockForm, "opens_at" | "closes_at">,
): void {
  const opensChanged = opensAt !== previous?.opens_at;
  const closesChanged = closesAt !== previous?.closes_at;
  if (!opensChanged && !closesChanged) return;

  const opens = opensAt ? Date.parse(opensAt) : null;
  const closes = closesAt ? Date.parse(closesAt) : null;
  if (
    Number.isNaN(opens) ||
    Number.isNaN(closes) ||
    (opens !== null && closes !== null && closes <= opens)
  ) {
    throw new ServiceError("DATE_RANGE_INVALID", 400);
  }
  if (
    (opensChanged && isPastScheduleMinute(opensAt, now)) ||
    (closesChanged && isPastScheduleMinute(closesAt, now))
  ) {
    throw new ServiceError("FORM_SCHEDULE_IN_PAST", 400);
  }
}

async function findExistingLiveType(
  eventId: string,
  type: FormType,
  excludeFormId?: string,
): Promise<MockForm | undefined> {
  const existing = await mockApi.get<MockForm[]>(
    `/forms?event_id=${encodeURIComponent(eventId)}&type=${encodeURIComponent(type)}`,
  );
  return existing.find(
    (row) =>
      !row.deleted_at &&
      !isCachedFormDeleted(row) &&
      row.id !== excludeFormId,
  );
}

async function loadFormTranslations(
  formId: string,
): Promise<MockFormTranslation[]> {
  const rows = await mockApi.get<MockFormTranslation[]>(
    `/form_translations?form_id=${encodeURIComponent(formId)}`,
  );
  return rows.filter((row) => row.form_id === formId);
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
  enScaleMinLabel = "",
  enScaleMaxLabel = "",
  thScaleMinLabel = "",
  thScaleMaxLabel = "",
): { en: Label[]; th: Label[] } {
  return {
    en: [
      {
        label: enLabel,
        placeholder: enPlaceholder,
        scale_min_label: enScaleMinLabel,
        scale_max_label: enScaleMaxLabel,
        choices: { en: enChoices, th: thChoices },
      },
    ],
    th: [
      {
        label: thLabel,
        placeholder: thPlaceholder,
        scale_min_label: thScaleMinLabel,
        scale_max_label: thScaleMaxLabel,
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
  const live = options
    .filter((o) => o.field_id === fieldId && !o.deleted_at)
    .sort((a, b) => a.display_order - b.display_order);
  const en: Choice[] = [];
  const th: Choice[] = [];

  for (const option of live) {
    const translations = (
      await mockApi.get<MockFieldOptionTranslation[]>(
        `/field_option_translations?option_id=${encodeURIComponent(option.id)}`,
      )
    ).filter((t) => t.option_id === option.id);
    const enRow = translations.find((t) => t.locale_code === "en");
    const thRow = translations.find((t) => t.locale_code === "th");
    en.push({
      id: option.id,
      label: enRow?.label ?? "",
      display_order: option.display_order,
    });
    th.push({
      id: option.id,
      label: thRow?.label ?? "",
      display_order: option.display_order,
    });
  }
  return { en, th };
}

async function loadQuestions(formId: string): Promise<Question[]> {
  const fields = await mockApi.get<MockFormField[]>(
    `/form_fields?form_id=${encodeURIComponent(formId)}&_sort=display_order&_order=asc`,
  );
  const live = fields
    .filter((f) => f.form_id === formId && !f.deleted_at)
    .sort((a, b) => a.display_order - b.display_order);
  const questions: Question[] = [];

  for (const field of live) {
    const translations = (
      await mockApi.get<MockFieldTranslation[]>(
        `/field_translations?field_id=${encodeURIComponent(field.id)}`,
      )
    ).filter((t) => t.field_id === field.id);
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
        min_value: field.min_number,
        max_value: field.max_number,
        min_length: nullToNumber(field.min_length),
        max_length: nullToNumber(field.max_length),
        is_required: field.is_required,
        is_unique: Boolean(field.is_unique),
        rating_display: (field.rating_display ?? "icon") as RATING_DISPLAY,
        rating_icon: (field.rating_icon ?? "star") as ICON,
        rating_max: nullToNumber(
          field.rating_max ?? field.max_number,
          type === "rating" ? 5 : 0,
        ),
        label: buildLabelPair(
          enT?.label ?? "",
          thT?.label ?? "",
          enT?.placeholder ?? "",
          thT?.placeholder ?? "",
          choices.en,
          choices.th,
          enT?.scale_min_label ?? "",
          enT?.scale_max_label ?? "",
          thT?.scale_min_label ?? "",
          thT?.scale_max_label ?? "",
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

function mergeWithCachedRecord(
  live: FormRecord,
  cached?: FormRecord,
): FormRecord {
  if (!cached) return live;

  const enTitle = live.head.en.title.trim()
    ? live.head.en.title
    : cached.head.en.title;
  const enDesc = live.head.en.description.trim()
    ? live.head.en.description
    : cached.head.en.description;
  const thTitle = live.head.th.title.trim()
    ? live.head.th.title
    : cached.head.th.title;
  const thDesc = live.head.th.description.trim()
    ? live.head.th.description
    : cached.head.th.description;

  const mergedQuestions: Question[] =
    live.questions.length === 0 && cached.questions.length > 0
      ? cached.questions
      : live.questions.map((item, idx) => {
          const q = item.question;
          const cachedItem =
            cached.questions.find((cq) => cq.question.id === q.id) ??
            cached.questions.find(
              (cq) =>
                cq.question.display_order === q.display_order &&
                cq.question.type === q.type,
            ) ??
            (cached.questions[idx]?.question.type === q.type
              ? cached.questions[idx]
              : undefined);

          if (!cachedItem) return item;

          const cq = cachedItem.question;
          const liveEn = q.label.en[0] ?? emptyLabel();
          const liveTh = q.label.th[0] ?? emptyLabel();
          const cachedEn = cq.label.en[0] ?? emptyLabel();
          const cachedTh = cq.label.th[0] ?? emptyLabel();

          const liveEnChoices = liveEn.choices.en;
          const liveThChoices = liveTh.choices.th;
          const hasLiveEnChoices =
            liveEnChoices.length > 0 &&
            liveEnChoices.some((c) => c.label.trim().length > 0);
          const hasLiveThChoices =
            liveThChoices.length > 0 &&
            liveThChoices.some((c) => c.label.trim().length > 0);

          const finalEnChoices = hasLiveEnChoices
            ? liveEnChoices
            : cachedEn.choices.en;
          const finalThChoices = hasLiveThChoices
            ? liveThChoices
            : cachedTh.choices.th;

          return {
            question: {
              ...q,
              label: buildLabelPair(
                liveEn.label.trim() ? liveEn.label : cachedEn.label,
                liveTh.label.trim() ? liveTh.label : cachedTh.label,
                liveEn.placeholder?.trim()
                  ? liveEn.placeholder
                  : cachedEn.placeholder,
                liveTh.placeholder?.trim()
                  ? liveTh.placeholder
                  : cachedTh.placeholder,
                finalEnChoices,
                finalThChoices,
                liveEn.scale_min_label?.trim()
                  ? (liveEn.scale_min_label ?? "")
                  : (cachedEn.scale_min_label ?? ""),
                liveEn.scale_max_label?.trim()
                  ? (liveEn.scale_max_label ?? "")
                  : (cachedEn.scale_max_label ?? ""),
                liveTh.scale_min_label?.trim()
                  ? (liveTh.scale_min_label ?? "")
                  : (cachedTh.scale_min_label ?? ""),
                liveTh.scale_max_label?.trim()
                  ? (liveTh.scale_max_label ?? "")
                  : (cachedTh.scale_max_label ?? ""),
              ),
            },
          };
        });

  return {
    ...live,
    head: {
      en: { title: enTitle, description: enDesc },
      th: { title: thTitle, description: thDesc },
    },
    questions: mergedQuestions,
  };
}

async function toFormRecord(
  form: MockForm,
  loadedEvent?: MockEvent,
): Promise<FormRecord> {
  const event = loadedEvent ?? (await loadEvent(form.event_id));
  const published = getPublishedForm(event, form.type);
  const lifecycle = readPublishedForm(form, published, event);
  if (published && lifecycle) {
    const { head, questions } = publishedFormDefinition(published);
    return {
      ...buildAuthoritativeFormRecord(lifecycle, head, questions),
      canEdit: false,
      canDelete: false,
      canChangeStatus: false,
    };
  }
  const cached = getCachedFormRecord(form.id, form.event_id, form.type);
  const translationRows = await loadFormTranslations(form.id);
  const questions = await loadQuestions(form.id);
  const status = resolveEffectiveFormStatus(form);
  const flags = formMutationFlags(status);
  const liveRecord: FormRecord = {
    id: form.id,
    eventId: form.event_id,
    type: form.type,
    status,
    opens_at: form.opens_at,
    closes_at: form.closes_at,
    opensAt: form.opens_at,
    closesAt: form.closes_at,
    createdAt: form.created_at,
    updatedAt: form.updated_at,
    head: headFromTranslations(translationRows),
    questions,
    canEdit: flags.canEdit,
    canDelete: flags.canDelete,
    canChangeStatus: flags.canChangeStatus,
  };
  return mergeWithCachedRecord(liveRecord, cached);
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
      await putOrPost(`/form_translations`, `/form_translations/${prev.id}`, {
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
    await deleteIgnore404(`/form_translations/${leftover.id}`);
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
    if (option.field_id === fieldId && !option.deleted_at) {
      await patchIgnore404(`/field_options/${option.id}`, {
        deleted_at: stamp,
      });
    }
  }
  await patchIgnore404(`/form_fields/${fieldId}`, {
    deleted_at: stamp,
    updated_at: stamp,
  });
}

/** Options share IDs/order; a missing translation stays blank. */
function resolveOptionLocales(
  enLabel: Label | undefined,
  thLabel?: Label,
): {
  en: Choice[];
  th: Choice[];
} {
  const en = enLabel?.choices.en.length ? enLabel.choices.en : thLabel?.choices.en ?? [];
  const th = thLabel?.choices.th.length ? thLabel.choices.th : enLabel?.choices.th ?? [];
  const thById = new Map(th.map((choice) => [choice.id, choice]));
  const thByOrder = new Map(th.map((choice) => [choice.display_order, choice]));
  const paired = new Set<Choice>();
  const pairs = en.map((choice) => {
    const translation = (choice.id ? thById.get(choice.id) : undefined) ?? thByOrder.get(choice.display_order);
    if (translation) paired.add(translation);
    return { id: choice.id ?? translation?.id, display_order: choice.display_order, en: choice.label, th: translation?.label ?? "" };
  });
  for (const choice of th) {
    if (!paired.has(choice))
      pairs.push({ id: choice.id, display_order: choice.display_order, en: "", th: choice.label });
  }
  pairs.sort((a, b) => a.display_order - b.display_order);
  return {
    en: pairs.map(({ id, display_order, en }) => ({ id, display_order, label: en })),
    th: pairs.map(({ id, display_order, th }) => ({ id, display_order, label: th })),
  };
}

function suppliedChoiceIds(question: Question["question"]): string[] {
  return [...question.label.en, ...question.label.th].flatMap((label) => [
    ...label.choices.en.flatMap((choice) => (choice.id ? [choice.id] : [])),
    ...label.choices.th.flatMap((choice) => (choice.id ? [choice.id] : [])),
  ]);
}

function assertValidUniqueField(questions: Question[]) {
  const issue = uniqueFieldIssue(questions);
  if (issue) throw new ServiceError(issue, 400);
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
      .filter((field) => field.form_id === formId && !field.deleted_at)
      .map((field) => [field.id, field]),
  );
  const cachedRecord = getCachedFormRecord(formId);
  const cachedFieldIds = new Set(
    (cachedRecord?.questions ?? [])
      .map((q) => q.question.id)
      .filter((id): id is string => Boolean(id)),
  );
  const cachedOptionIdsByField = new Map<string, Set<string>>();
  for (const qItem of cachedRecord?.questions ?? []) {
    if (!qItem.question.id) continue;
    cachedOptionIdsByField.set(
      qItem.question.id,
      new Set(suppliedChoiceIds(qItem.question)),
    );
  }

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

    const ownedInLiveOrCache =
      liveFields.has(question.id) || cachedFieldIds.has(question.id);
    if (!ownedInLiveOrCache && liveFields.size > 0) {
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
      options
        .filter((option) => option.field_id === question.id && !option.deleted_at)
        .map((option) => option.id),
    );
    const cachedOptionIds = cachedOptionIdsByField.get(question.id);
    const seenOptionIds = new Set<string>();
    for (const optionId of choiceIds) {
      if (seenOptionIds.has(optionId)) continue;
      seenOptionIds.add(optionId);
      const optionOwned =
        liveOptionIds.has(optionId) || Boolean(cachedOptionIds?.has(optionId));
      if (!optionOwned && liveOptionIds.size > 0) {
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
): Promise<Question[]> {
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

  const persistedQuestions: Question[] = [];

  for (const item of questions) {
    const q = item.question;
    const mockType = toMockFieldType(q.type);
    const fieldId = q.id ?? newId();
    const enLabel = q.label.en[0] ?? emptyLabel();
    const thLabel = q.label.th[0] ?? emptyLabel();

    const ratingDisplay: MockRatingDisplay | null =
      q.type === "rating" ? q.rating_display : null;
    const ratingIcon: MockRatingIcon | null =
      q.type === "rating" ? q.rating_icon : null;
    const ratingMax =
      q.type === "rating" ? unsetToNull(q.rating_max || q.max_number) : null;

    const minNumber =
      q.type === "number" && q.min_value !== undefined
        ? q.min_value
        : unsetToNull(q.min_number);
    const maxNumber =
      q.type === "number" && q.max_value !== undefined
        ? q.max_value
        : unsetToNull(q.max_number);

    const fieldBody: MockFormField = {
      id: fieldId,
      form_id: formId,
      type: mockType,
      display_order: q.display_order,
      is_required: q.is_required,
      is_unique: Boolean(q.is_unique),
      min_number: minNumber,
      max_number: maxNumber,
      min_length: unsetToNull(q.min_length),
      max_length: unsetToNull(q.max_length),
      validation_pattern: null,
      rating_display: ratingDisplay,
      rating_icon: ratingIcon,
      rating_max: ratingMax,
      created_at: stamp,
      updated_at: stamp,
      deleted_at: null,
    };

    const prev = existing.find((f) => f.id === fieldId);
    if (prev || q.id) {
      await putOrPost(`/form_fields`, `/form_fields/${fieldId}`, {
        ...fieldBody,
        created_at: prev?.created_at ?? stamp,
        validation_pattern: prev?.validation_pattern ?? null,
      });
      const oldTranslations = (
        await mockApi.get<MockFieldTranslation[]>(
          `/field_translations?field_id=${encodeURIComponent(fieldId)}`,
        )
      ).filter((row) => row.field_id === fieldId);
      for (const row of oldTranslations) {
        await deleteIgnore404(`/field_translations/${row.id}`);
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
      scale_min_label: enLabel.scale_min_label || null,
      scale_max_label: enLabel.scale_max_label || null,
    });
    await mockApi.post("/field_translations", {
      id: newId(),
      field_id: fieldId,
      locale_code: "th",
      label: thLabel.label,
      placeholder: thLabel.placeholder || null,
      scale_min_label: thLabel.scale_min_label || null,
      scale_max_label: thLabel.scale_max_label || null,
    });

    const existingOptions = (
      await mockApi.get<MockFieldOption[]>(
        `/field_options?field_id=${encodeURIComponent(fieldId)}`,
      )
    ).filter((opt) => opt.field_id === fieldId);

    if (!CHOICE_TYPES.has(q.type)) {
      for (const option of existingOptions) {
        if (!option.deleted_at) {
          await patchIgnore404(`/field_options/${option.id}`, {
            deleted_at: stamp,
          });
        }
      }
      persistedQuestions.push({
        question: {
          id: fieldId,
          type: q.type,
          display_order: q.display_order,
          min_number: nullToNumber(minNumber, q.type === "rating" ? 1 : 0),
          max_number: nullToNumber(maxNumber, q.type === "rating" ? 5 : 0),
          min_value: minNumber,
          max_value: maxNumber,
          min_length: nullToNumber(unsetToNull(q.min_length)),
          max_length: nullToNumber(unsetToNull(q.max_length)),
          is_required: q.is_required,
          is_unique: Boolean(q.is_unique),
          rating_display: (ratingDisplay ?? "icon") as RATING_DISPLAY,
          rating_icon: (ratingIcon ?? "star") as ICON,
          rating_max: nullToNumber(
            ratingMax ?? maxNumber,
            q.type === "rating" ? 5 : 0,
          ),
          label: buildLabelPair(
            enLabel.label,
            thLabel.label,
            enLabel.placeholder ?? "",
            thLabel.placeholder ?? "",
            [],
            [],
            enLabel.scale_min_label ?? "",
            enLabel.scale_max_label ?? "",
            thLabel.scale_min_label ?? "",
            thLabel.scale_max_label ?? "",
          ),
        },
      });
      continue;
    }

    const { en: enChoices, th: thChoices } = resolveOptionLocales(
      enLabel,
      thLabel,
    );
    const keepOptionIds = new Set(
      enChoices.map((c) => c.id).filter((id): id is string => Boolean(id)),
    );
    for (const option of existingOptions) {
      if (!option.deleted_at && !keepOptionIds.has(option.id)) {
        await patchIgnore404(`/field_options/${option.id}`, {
          deleted_at: stamp,
        });
      }
    }

    const savedEnChoices: Choice[] = [];
    const savedThChoices: Choice[] = [];

    for (const [index, enChoice] of enChoices.entries()) {
      const optionId = enChoice.id ?? newId();
      const thChoice = thChoices[index];
      const thChoiceLabel = thChoice.label;
      const prevOption = existingOptions.find((o) => o.id === optionId);
      const optionBody: MockFieldOption = {
        id: optionId,
        field_id: fieldId,
        display_order: enChoice.display_order,
        created_at: prevOption?.created_at ?? stamp,
        deleted_at: null,
      };
      if (prevOption || enChoice.id) {
        await putOrPost(`/field_options`, `/field_options/${optionId}`, optionBody);
        const oldOptTranslations = (
          await mockApi.get<MockFieldOptionTranslation[]>(
            `/field_option_translations?option_id=${encodeURIComponent(optionId)}`,
          )
        ).filter((row) => row.option_id === optionId);
        for (const row of oldOptTranslations) {
          await deleteIgnore404(`/field_option_translations/${row.id}`);
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
        label: thChoiceLabel,
      });

      savedEnChoices.push({
        id: optionId,
        label: enChoice.label,
        display_order: enChoice.display_order,
      });
      savedThChoices.push({
        id: optionId,
        label: thChoiceLabel,
        display_order: enChoice.display_order,
      });
    }

    persistedQuestions.push({
      question: {
        id: fieldId,
        type: q.type,
        display_order: q.display_order,
        min_number: nullToNumber(minNumber, q.type === "rating" ? 1 : 0),
        max_number: nullToNumber(maxNumber, q.type === "rating" ? 5 : 0),
        min_value: minNumber,
        max_value: maxNumber,
        min_length: nullToNumber(unsetToNull(q.min_length)),
        max_length: nullToNumber(unsetToNull(q.max_length)),
        is_required: q.is_required,
        is_unique: Boolean(q.is_unique),
        rating_display: (ratingDisplay ?? "icon") as RATING_DISPLAY,
        rating_icon: (ratingIcon ?? "star") as ICON,
        rating_max: nullToNumber(
          ratingMax ?? maxNumber,
          q.type === "rating" ? 5 : 0,
        ),
        label: buildLabelPair(
          enLabel.label,
          thLabel.label,
          enLabel.placeholder ?? "",
          thLabel.placeholder ?? "",
          savedEnChoices,
          savedThChoices,
          enLabel.scale_min_label ?? "",
          enLabel.scale_max_label ?? "",
          thLabel.scale_min_label ?? "",
          thLabel.scale_max_label ?? "",
        ),
      },
    });
  }

  return persistedQuestions;
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
  const formTranslations = await loadFormTranslations(formId);
  const fields = (
    await mockApi.get<MockFormField[]>(
      `/form_fields?form_id=${encodeURIComponent(formId)}`,
    )
  ).filter((f) => f.form_id === formId);
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
      await deleteIgnore404(`/${endpoint}/${row.id}`);
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
      await putOrPost(`/${endpoint}`, `/${endpoint}/${row.id}`, row);
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

  await putOrPost(`/forms`, `/forms/${snapshot.form.id}`, snapshot.form);
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
    await deleteIgnore404(`/field_option_translations/${row.id}`);
  }
  for (const row of current.options) {
    await deleteIgnore404(`/field_options/${row.id}`);
  }
  for (const row of current.fieldTranslations) {
    await deleteIgnore404(`/field_translations/${row.id}`);
  }
  for (const row of current.fields) {
    await deleteIgnore404(`/form_fields/${row.id}`);
  }
  for (const row of current.formTranslations) {
    await deleteIgnore404(`/form_translations/${row.id}`);
  }
  await deleteIgnore404(`/forms/${formId}`);
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
    if (/EROFS|read-only file system/i.test(message)) {
      throw new ServiceError("MOCK_READ_ONLY", 503, "Mock API is read-only");
    }
    throw new ServiceError(
      "FORM_WRITE_INCOMPLETE",
      502,
      "Form write failed and automatic rollback could not complete",
    );
  }
  if (
    originalError instanceof Error &&
    /EROFS|read-only file system/i.test(originalError.message)
  ) {
    throw new ServiceError("MOCK_READ_ONLY", 503, "Mock API is read-only");
  }
  throw originalError;
}

function liveEventWindow(event: MockEvent): FormListData["legacyScheduleWindow"] {
  if (event.status !== "open" && event.status !== "scheduled") return null;
  return {
    startsAt: event.start_at ?? event.opens_at ?? null,
    endsAt: event.end_at ?? event.closes_at ?? null,
  };
}

export async function listForms(
  eventId: string,
  allowedTypes: readonly FormType[],
): Promise<FormListData> {
  const event = await loadEvent(eventId);
  const forms = await mockApi.get<MockForm[]>(
    `/forms?event_id=${encodeURIComponent(eventId)}`,
  );
  const allowed = new Set(allowedTypes);
  const eventForms = forms.filter((form) => form.event_id === eventId);
  const live = eventForms.filter(
    (form) =>
      !form.deleted_at && allowed.has(form.type) && !isCachedFormDeleted(form),
  );
  const items: FormRecord[] = [];
  const seenIds = new Set(eventForms.map((form) => form.id));
  const seenTypes = new Set<FormType>();

  for (const form of live) {
    const rec = await toFormRecord(form, event);
    items.push(rec);
    seenTypes.add(rec.type);
  }

  for (const cached of getCachedFormsForEvent(eventId, allowed)) {
    if (!seenIds.has(cached.id) && !seenTypes.has(cached.type)) {
      if (getPublishedForm(event, cached.type)) continue;
      items.push(cached);
      seenIds.add(cached.id);
      seenTypes.add(cached.type);
    }
  }

  const published = !!readSetupRecord(event).publication;
  return {
    eventId: event.id,
    legacyScheduleWindow: published ? null : liveEventWindow(event),
    hasRegistration:
      (event.has_registration ?? true) ||
      items.some((f) => f.type === "registration"),
    hasSurvey:
      (event.has_survey ?? true) || items.some((f) => f.type === "survey"),
    forms: published
      ? items.map((record) => record.status === "draft" ? { ...record, canChangeStatus: false } : record)
      : items,
  };
}

export async function getForm(id: string): Promise<FormRecord> {
  const form = await getLiveForm(id);
  return toFormRecord(form);
}

function buildAuthoritativeFormRecord(
  form: MockForm,
  head: Form["head"],
  questions: Question[],
): FormRecord {
  const status = resolveEffectiveFormStatus(form);
  const flags = formMutationFlags(status);
  return {
    id: form.id,
    eventId: form.event_id,
    type: form.type,
    status,
    opens_at: form.opens_at,
    closes_at: form.closes_at,
    opensAt: form.opens_at,
    closesAt: form.closes_at,
    createdAt: form.created_at,
    updatedAt: form.updated_at,
    head: {
      en: {
        title: head.en.title,
        description: head.en.description,
      },
      th: {
        title: head.th.title,
        description: head.th.description,
      },
    },
    questions,
    canEdit: flags.canEdit,
    canDelete: flags.canDelete,
    canChangeStatus: flags.canChangeStatus,
  };
}

export async function createForm(
  input: FormCreateBody,
  userId: string,
): Promise<FormRecord> {
  assertValidUniqueField(input.questions);
  return writeSerially(input.eventId, () => createOrUpdateDraft(input, userId));
}

async function createOrUpdateDraft(input: FormCreateBody, userId: string): Promise<FormRecord> {
  const event = await loadEvent(input.eventId, { fresh: true });
  if (getPublishedForm(event, input.type)) {
    throw new ServiceError("FORM_TYPE_EXISTS", 409, `A published ${input.type} form already exists for this event`);
  }
  const existingConflict = await findExistingLiveType(input.eventId, input.type);
  if (existingConflict) {
    if (resolveEffectiveFormStatus(existingConflict) === "draft") {
      return updateDraft(existingConflict, input, userId);
    }
    throw new ServiceError(
      "FORM_TYPE_EXISTS",
      409,
      `A live ${input.type} form already exists for this event`,
    );
  }
  assertNewQuestionTreeHasNoIds(input.questions);

  const stamp = nowIso();
  const id = newId();
  const opensAt = input.opens_at?.trim() || null;
  const closesAt = input.closes_at?.trim() || null;
  assertFormSchedule(opensAt, closesAt, Date.parse(stamp));
  const form: MockForm = {
    id,
    event_id: input.eventId,
    type: input.type,
    status: "draft",
    opens_at: opensAt,
    closes_at: closesAt,
    created_at: stamp,
    created_by: userId,
    updated_at: stamp,
    updated_by: userId,
    deleted_at: null,
  };

  try {
    const flagKey =
      input.type === "registration" ? "has_registration" : "has_survey";
    if (!event[flagKey]) {
      await patchIgnore404(`/events/${event.id}`, {
        [flagKey]: true,
        updated_at: stamp,
        updated_by: userId,
      });
    }
    await mockApi.post("/forms", form);
    await writeFormTranslations(id, input.head, stamp);
    const savedQuestions = input.questions.length
      ? await replaceQuestionTree(id, input.questions, stamp, [])
      : [];
    const authoritative = buildAuthoritativeFormRecord(
      form,
      input.head,
      savedQuestions,
    );
    saveCachedFormRecord(authoritative);
    await writeAuditLog({
      actorUserId: userId,
      eventId: input.eventId,
      action: "create",
      resourceType: "form",
      resourceId: id,
      module:
        input.type === "registration"
          ? "registration_builder"
          : "survey_builder",
      descriptionTh:
        input.type === "registration"
          ? "สร้างฟอร์มลงทะเบียน"
          : "สร้างแบบสอบถาม",
      descriptionEn:
        input.type === "registration"
          ? "Created registration form"
          : "Created survey form",
    });
    return authoritative;
  } catch (error) {
    return compensateOrThrow(() => cleanupCreatedForm(id), error);
  }
}

export async function updateForm(
  id: string,
  input: Form,
  userId: string,
): Promise<FormRecord> {
  return writeFormSerially(id, (form, event) => {
    assertUnpublishedForm(form, event, "FORM_NOT_EDITABLE");
    assertValidUniqueField(input.questions);
    return updateDraft(form, input, userId);
  });
}

async function updateDraft(form: MockForm, input: Form, userId: string): Promise<FormRecord> {
  const { id } = form;
  const effective = resolveEffectiveFormStatus(form);
  assertCanEdit(effective);

  const stamp = nowIso();
  const opensAt =
    input.opens_at !== undefined
      ? input.opens_at?.trim() || null
      : form.opens_at;
  const closesAt =
    input.closes_at !== undefined
      ? input.closes_at?.trim() || null
      : form.closes_at;
  assertFormSchedule(opensAt, closesAt, Date.parse(stamp), form);

  const fields = await assertQuestionTreeOwnership(id, input.questions);
  const snapshot = await captureFormTree(form);

  const updatedForm: MockForm = {
    ...form,
    status: "draft",
    opens_at: opensAt,
    closes_at: closesAt,
    updated_by: userId,
    updated_at: stamp,
  };

  try {
    await putOrPost(`/forms`, `/forms/${id}`, updatedForm);
    await writeFormTranslations(id, input.head, stamp);
    const savedQuestions = await replaceQuestionTree(
      id,
      input.questions,
      stamp,
      fields,
    );
    const authoritative = buildAuthoritativeFormRecord(
      updatedForm,
      input.head,
      savedQuestions,
    );
    saveCachedFormRecord(authoritative);
    await writeAuditLog({
      actorUserId: userId,
      eventId: form.event_id,
      action: "update",
      resourceType: "form",
      resourceId: id,
      module:
        form.type === "registration"
          ? "registration_builder"
          : "survey_builder",
      descriptionTh:
        form.type === "registration"
          ? "แก้ไขฟอร์มลงทะเบียน"
          : "แก้ไขแบบสอบถาม",
      descriptionEn:
        form.type === "registration"
          ? "Updated registration form"
          : "Updated survey form",
    });
    return authoritative;
  } catch (error) {
    return compensateOrThrow(() => restoreFormTree(snapshot), error);
  }
}

export async function updateFormStatus(
  id: string,
  patch: FormStatusPatchInput,
  userId: string,
): Promise<FormRecord> {
  return writeFormSerially(id, (form, event) =>
    changeFormStatus(form, event, patch, userId),
  );
}

async function changeFormStatus(
  form: MockForm,
  event: MockEvent,
  patch: FormStatusPatchInput,
  userId: string,
): Promise<FormRecord> {
  const { id } = form;
  const current = resolveEffectiveFormStatus(form);
  const activating = current === "draft" && patch.status === "scheduled";
  if (activating) {
    if (readSetupRecord(event).publication) {
      throw new ServiceError("FORM_STATUS_LOCKED", 409, "Published event forms are read-only");
    }
  } else {
    assertUnpublishedForm(form, event, "FORM_STATUS_LOCKED");
  }
  assertCanChangeStatus(current);
  const stamp = nowIso();
  assertManualFormStatusTransition(current, patch.status);

  const opensAt =
    patch.opensAt !== undefined ? patch.opensAt?.trim() || null : form.opens_at;
  const closesAt =
    patch.closesAt !== undefined
      ? patch.closesAt?.trim() || null
      : form.closes_at;
  const scheduleChanged = opensAt !== form.opens_at || closesAt !== form.closes_at;
  if (form.type === "registration" && patch.status === "scheduled" && (activating || scheduleChanged)) {
    const window = liveEventWindow(event);
    if (event.status === "closed" ||
      (window && registrationOutsideEvent(window.endsAt, opensAt, closesAt, Date.parse(stamp)))) {
      throw new ServiceError("REGISTRATION_OUTSIDE_EVENT", 400);
    }
  }
  assertFormSchedule(
    opensAt,
    closesAt,
    Date.parse(stamp),
    activating ? undefined : form,
  );

  const recordBefore = await toFormRecord(form, event);

  if (patch.status === "scheduled") {
    assertValidUniqueField(recordBefore.questions);
    if (!opensAt && !closesAt) {
      throw new ServiceError(
        "FORM_SCHEDULE_REQUIRED",
        400,
        "Scheduling requires opensAt and/or closesAt",
      );
    }
    const publishError = validatePublishReady({
      head: recordBefore.head,
      questions: recordBefore.questions,
    });
    if (publishError) {
      throw new ServiceError("FORM_NOT_READY", 400, publishError);
    }
  }

  const updatedForm: MockForm = {
    ...form,
    status: patch.status,
    opens_at: opensAt,
    closes_at: closesAt,
    updated_by: userId,
    updated_at: stamp,
  };

  await putOrPost(`/forms`, `/forms/${id}`, updatedForm);
  const authoritative = buildAuthoritativeFormRecord(
    updatedForm,
    recordBefore.head,
    recordBefore.questions,
  );
  saveCachedFormRecord(authoritative);
  return authoritative;
}

/**
 * Cron tick: persist scheduled→open and open→closed from schedule windows.
 * Call via `POST /api/event/forms/cron` with `CRON_SECRET`.
 */
export async function runFormsCron(
  nowMs: number = Date.now(),
): Promise<FormCronResult> {
  const forms = await mockApi.get<MockForm[]>("/forms");
  const live = forms.filter(
    (form) => !form.deleted_at && !isCachedFormDeleted(form),
  );
  const stamp = new Date(nowMs).toISOString();
  const eventCache = new Map<string, MockEvent>();
  const opened: string[] = [];
  const closed: string[] = [];

  for (const form of live) {
    let event = eventCache.get(form.event_id);
    if (!event) {
      try {
        event = await loadEvent(form.event_id);
      } catch {
        continue;
      }
      eventCache.set(form.event_id, event);
    }

    const scheduledForm = withPublishedFormSchedule(form, event);
    const next = nextCronFormStatus(scheduledForm, event, nowMs);
    if (!next || next === form.status) continue;

    const updatedForm: MockForm = {
      ...form,
      status: next,
      updated_at: stamp,
      updated_by: form.updated_by,
    };
    await putOrPost(`/forms`, `/forms/${form.id}`, updatedForm);
    const cached = getCachedFormRecord(form.id, form.event_id, form.type);
    if (cached) {
      saveCachedFormRecord(
        buildAuthoritativeFormRecord(updatedForm, cached.head, cached.questions),
      );
    }

    if (next === "open") opened.push(form.id);
    if (next === "closed") closed.push(form.id);
  }

  return {
    checked: live.length,
    opened,
    closed,
    ranAt: stamp,
  };
}

export async function deleteForm(id: string, userId: string): Promise<void> {
  return writeFormSerially(id, (form, event) => {
    assertUnpublishedForm(form, event, "FORM_NOT_DELETABLE");
    return removeDraft(form, userId);
  });
}

async function removeDraft(form: MockForm, userId: string): Promise<void> {
  const { id } = form;
  const effective = resolveEffectiveFormStatus(form);
  assertCanDelete(effective);

  const snapshot = await captureFormTree(form);
  const stamp = nowIso();

  try {
    for (const field of snapshot.fields) {
      if (!field.deleted_at) {
        await softDeleteFieldTree(field.id, stamp);
      }
    }

    await putOrPost(`/forms`, `/forms/${id}`, {
      ...form,
      deleted_at: stamp,
      updated_by: userId,
      updated_at: stamp,
    });
    markCachedFormDeleted(id, stamp);
    await writeAuditLog({
      actorUserId: userId,
      eventId: form.event_id,
      action: "delete",
      resourceType: "form",
      resourceId: id,
      module:
        form.type === "registration"
          ? "registration_builder"
          : "survey_builder",
      descriptionTh:
        form.type === "registration"
          ? "ลบฟอร์มลงทะเบียน"
          : "ลบแบบสอบถาม",
      descriptionEn:
        form.type === "registration"
          ? "Deleted registration form"
          : "Deleted survey form",
    });
  } catch (error) {
    await compensateOrThrow(() => restoreFormTree(snapshot), error);
  }
}

/** Restore only the children soft-deleted with this form. */
export async function restoreDeletedForm(
  form: MockForm,
  userId: string,
  restoredAt: string,
): Promise<void> {
  const deletedAt = form.deleted_at;
  if (deletedAt) {
    const fields = await mockApi.get<MockFormField[]>(
      `/form_fields?form_id=${encodeURIComponent(form.id)}`,
    );
    for (const field of fields) {
      if (field.form_id !== form.id || field.deleted_at !== deletedAt) continue;
      const options = await mockApi.get<MockFieldOption[]>(
        `/field_options?field_id=${encodeURIComponent(field.id)}`,
      );
      // Keep the field deleted until its options are restored so retries can
      // resume after a failed option write.
      for (const option of options) {
        if (option.field_id === field.id && option.deleted_at === deletedAt) {
          await mockApi.patch(`/field_options/${encodeURIComponent(option.id)}`, {
            deleted_at: null,
          });
        }
      }
      await mockApi.patch(`/form_fields/${encodeURIComponent(field.id)}`, {
        deleted_at: null,
        updated_at: restoredAt,
      });
    }

    const formPath = `/forms/${encodeURIComponent(form.id)}`;
    try {
      await mockApi.patch(formPath, {
        deleted_at: null,
        updated_at: restoredAt,
        updated_by: userId,
      });
    } catch (error) {
      // An upstream write can complete even if its response is lost.
      const saved = await mockApi.get<MockForm>(formPath).catch(() => undefined);
      if (
        saved?.id !== form.id ||
        saved.event_id !== form.event_id ||
        saved.deleted_at !== null ||
        saved.updated_at !== restoredAt ||
        saved.updated_by !== userId
      ) {
        throw error;
      }
    }
  }
  clearCachedFormDeletion(form.id);
}
