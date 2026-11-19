"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  EyeIcon,
  LockClosedIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Skeleton from "@/components/ui/skeleton/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/core/api";
import { ThFlagIcon, UsFlagIcon } from "@/icons";
import {
  Choice,
  Form,
  FormListResponse,
  FormLocale,
  FormRecord,
  FormStatus,
  FormType,
  ICON,
  Question,
  QUESTIONS_TYPES,
  QuestionType,
  RATING_DISPLAY,
  UNIQUE_QUESTION_TYPES,
} from "@/types/event/form";
import type { EventWorkspace } from "@/types/event/workspace";
import { showToast } from "@/utils/alert";
import FormHeaderCard from "./FormHeaderCard";
import QuestionCard from "./QuestionCard";
import FloatingToolbar from "./FloatingToolbar";
import FormPreview from "./FormPreview/FormPreview";

const CHOICE_QUESTION_TYPES: QuestionType[] = [
  "multiple_choice",
  "checkbox",
  "dropdown",
  "rating",
];

const PERSISTED_CHOICE_TYPES = new Set<QuestionType>([
  "multiple_choice",
  "checkbox",
  "dropdown",
]);

const KNOWN_FORM_ERROR_CODES = new Set([
  "FORM_SCHEDULE_REQUIRED",
  "FORM_NOT_READY",
  "FORM_NOT_EDITABLE",
  "FORM_NOT_DELETABLE",
  "FORM_STATUS_LOCKED",
  "FORM_STATUS_CRON_ONLY",
  "INVALID_FORM_STATUS_TRANSITION",
  "FORM_TYPE_EXISTS",
  "FORM_TYPE_NOT_ENABLED",
  "FORM_NOT_FOUND",
  "EVENT_NOT_FOUND",
  "FORBIDDEN",
  "UNAUTHORIZED",
  "VALIDATION_ERROR",
  "INVALID_QUESTION_ID",
  "INVALID_OPTION_ID",
  "DUPLICATE_QUESTION_ID",
  "QUESTION_NOT_OWNED_BY_FORM",
  "OPTION_NOT_OWNED_BY_QUESTION",
  "FORM_WRITE_INCOMPLETE",
  "MOCK_READ_ONLY",
  "MOCK_API_ERROR",
]);

function toFlatpickrDateTime(raw: string | null | undefined): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(trimmed)) return trimmed;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return trimmed;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function toApiIsoDateTime(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  const normalized = trimmed.includes("T")
    ? trimmed
    : trimmed.replace(" ", "T");
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? trimmed : d.toISOString();
}

function createChoicePair(order: number): { th: Choice; en: Choice } {
  const id = crypto.randomUUID();
  const base: Choice = {
    id,
    label: `Option ${order}`,
    display_order: order,
    scale_min_label: "",
    scale_max_label: "",
  };
  return {
    th: { ...base },
    en: { ...base },
  };
}

function createQuestion(order: number): Question {
  const firstChoice = createChoicePair(1);
  const sharedChoices = {
    th: [firstChoice.th],
    en: [firstChoice.en],
  };

  return {
    question: {
      id: crypto.randomUUID(),
      type: QUESTIONS_TYPES[0] as QuestionType,
      display_order: order,
      min_number: 1,
      max_number: 5,
      min_length: 0,
      max_length: 255,
      is_required: false,
      is_unique: false,
      rating_display: "icon",
      rating_icon: "star",
      rating_max: 5,
      label: {
        th: [
          {
            choices: sharedChoices,
            label: "",
            placeholder: "",
            scale_min_label: "",
            scale_max_label: "",
          },
        ],
        en: [
          {
            choices: sharedChoices,
            label: "",
            placeholder: "",
            scale_min_label: "",
            scale_max_label: "",
          },
        ],
      },
    },
  };
}

export default function FormBuilder({ type }: { type: FormType }) {
  const t = useTranslations("form");
  const tbuilder = useTranslations("form.builder");
  const terrors = useTranslations("form.errors");
  const tcommon = useTranslations("common");
  const router = useRouter();
  const { user } = useAuth();

  const resolveErrorMessage = useCallback(
    (err: unknown, fallback: string): string => {
      if (err instanceof ApiError) {
        if (err.details?.some((d) => d.path.includes("closes_at") || d.path.includes("opens_at"))) {
          return terrors("DATE_RANGE_INVALID");
        }
        if (err.details?.some((d) => d.path.includes("min_number") || d.path.includes("min_value"))) {
          return terrors("NUMBER_RANGE_INVALID");
        }
        if (err.code && KNOWN_FORM_ERROR_CODES.has(err.code)) {
          return terrors(err.code);
        }
        if (err.status === 401) return terrors("UNAUTHORIZED");
        if (err.status === 403) return terrors("FORBIDDEN");
        if (err.status === 502) return terrors("MOCK_API_ERROR");
      }
      return fallback;
    },
    [terrors],
  );

  const [hasEnglish, setHasEnglish] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<FormLocale>("th");

  const [eventId, setEventId] = useState<string | null>(null);
  const [formId, setFormId] = useState<string | null>(null);
  const [formStatus, setFormStatus] = useState<FormStatus>("draft");
  const [canEdit, setCanEdit] = useState<boolean>(true);
  /** Permission matrix is view_only — stay in FormPreview; never reopen editor. */
  const [previewOnly, setPreviewOnly] = useState<boolean>(false);
  const [canChangeStatus, setCanChangeStatus] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const serverQuestionIdsRef = useRef<Set<string>>(new Set());
  const serverChoiceIdsRef = useRef<Set<string>>(new Set());

  const [form, setForm] = useState<Form>(() => {
    const firstQuestion = createQuestion(1);
    const initialTitle =
      type === "registration" ? t("registration") : t("survey");
    const initialDesc = tbuilder("description");

    return {
      head: {
        th: {
          title: initialTitle,
          description: initialDesc,
        },
        en: {
          title: initialTitle,
          description: initialDesc,
        },
      },
      type,
      opens_at: "",
      closes_at: "",
      questions: [firstQuestion],
    };
  });

  const [isPreview, setIsPreview] = useState<boolean>(false);
  const [activeSectionId, setActiveSectionId] = useState<string>(
    () => form.questions[0]?.question.id ?? "header",
  );
  const [toolbarTop, setToolbarTop] = useState<number>(0);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [draggedQuestionId, setDraggedQuestionId] = useState<string | null>(
    null,
  );
  const [dragOverQuestionId, setDragOverQuestionId] = useState<string | null>(
    null,
  );

  const [draggedChoice, setDraggedChoice] = useState<{
    questionId: string;
    choiceId: string;
  } | null>(null);
  const [dragOverChoice, setDragOverChoice] = useState<{
    questionId: string;
    choiceId: string;
  } | null>(null);

  const applyServerRecord = useCallback(
    (record: FormRecord, preserveHasEnglish = false) => {
      const qIds = new Set<string>();
      const cIds = new Set<string>();
      let detectedEnglishDiff =
        record.head.en.title.trim() !== record.head.th.title.trim() ||
        record.head.en.description.trim() !==
          record.head.th.description.trim();

      const normalizedQuestions: Question[] = (
        record.questions.length > 0 ? record.questions : [createQuestion(1)]
      ).map((item, idx) => {
        const q = item.question;
        const qId = q.id || crypto.randomUUID();
        if (q.id) qIds.add(q.id);

        const enLbl = q.label.en[0];
        const thLbl = q.label.th[0];
        if (
          (enLbl?.label ?? "").trim() !== (thLbl?.label ?? "").trim() ||
          (enLbl?.scale_min_label ?? "") !== (thLbl?.scale_min_label ?? "") ||
          (enLbl?.scale_max_label ?? "") !== (thLbl?.scale_max_label ?? "")
        ) {
          detectedEnglishDiff = true;
        }

        const rawEnChoices = enLbl?.choices.en ?? [];
        const rawThChoices = thLbl?.choices.th ?? enLbl?.choices.th ?? [];
        rawEnChoices.forEach((c) => {
          if (c.id) cIds.add(c.id);
        });
        rawThChoices.forEach((c) => {
          if (c.id) cIds.add(c.id);
        });

        let syncedChoices: { th: Choice[]; en: Choice[] };
        if (rawEnChoices.length > 0 || rawThChoices.length > 0) {
          const len = Math.max(rawEnChoices.length, rawThChoices.length);
          const thList: Choice[] = [];
          const enList: Choice[] = [];
          for (let i = 0; i < len; i += 1) {
            const enC = rawEnChoices[i];
            const thC = rawThChoices[i];
            const sharedId = enC?.id || thC?.id || crypto.randomUUID();
            const thText = thC?.label ?? enC?.label ?? `Option ${i + 1}`;
            const enText = enC?.label ?? thC?.label ?? `Option ${i + 1}`;
            if (thText !== enText) detectedEnglishDiff = true;
            thList.push({
              id: sharedId,
              label: thText,
              display_order: i + 1,
              scale_min_label: thLbl?.scale_min_label ?? "",
              scale_max_label: thLbl?.scale_max_label ?? "",
            });
            enList.push({
              id: sharedId,
              label: enText,
              display_order: i + 1,
              scale_min_label: enLbl?.scale_min_label ?? "",
              scale_max_label: enLbl?.scale_max_label ?? "",
            });
          }
          syncedChoices = { th: thList, en: enList };
        } else {
          const fallback = createChoicePair(1);
          syncedChoices = { th: [fallback.th], en: [fallback.en] };
        }

        return {
          question: {
            ...q,
            id: qId,
            display_order: idx + 1,
            label: {
              th: [
                {
                  label: thLbl?.label ?? "",
                  placeholder: thLbl?.placeholder ?? "",
                  scale_min_label: thLbl?.scale_min_label ?? "",
                  scale_max_label: thLbl?.scale_max_label ?? "",
                  choices: syncedChoices,
                },
              ],
              en: [
                {
                  label: enLbl?.label ?? thLbl?.label ?? "",
                  placeholder: enLbl?.placeholder ?? thLbl?.placeholder ?? "",
                  scale_min_label:
                    enLbl?.scale_min_label ?? thLbl?.scale_min_label ?? "",
                  scale_max_label:
                    enLbl?.scale_max_label ?? thLbl?.scale_max_label ?? "",
                  choices: syncedChoices,
                },
              ],
            },
          },
        };
      });

      serverQuestionIdsRef.current = qIds;
      serverChoiceIdsRef.current = cIds;

      setFormId(record.id);
      setFormStatus(record.status);
      setCanEdit(record.canEdit);
      setCanChangeStatus(record.canChangeStatus);
      if (!preserveHasEnglish) {
        setHasEnglish(detectedEnglishDiff);
      }

      const defaultTitle =
        record.type === "registration" ? t("registration") : t("survey");
      const thTitle =
        record.head.th.title.trim() ||
        record.head.en.title.trim() ||
        defaultTitle;
      const enTitle = record.head.en.title.trim() || thTitle;

      setForm({
        id: record.id,
        type: record.type,
        head: {
          th: {
            title: thTitle,
            description: record.head.th.description,
          },
          en: {
            title: enTitle,
            description: record.head.en.description,
          },
        },
        opens_at: toFlatpickrDateTime(record.opensAt ?? record.opens_at),
        closes_at: toFlatpickrDateTime(record.closesAt ?? record.closes_at),
        questions: normalizedQuestions,
      });

      setActiveSectionId(normalizedQuestions[0]?.question.id ?? "header");
    },
    [t],
  );

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function loadInitial() {
      setIsLoading(true);
      try {
        const ws = await api.get<EventWorkspace>("/event/workspace");
        if (cancelled) return;
        setEventId(ws.eventId);

        const listRes = await api.get<FormListResponse>(
          `/event/forms?eventId=${encodeURIComponent(ws.eventId)}`,
        );
        if (cancelled) return;

        const formAccess =
          type === "registration"
            ? listRes.registrationFormAccess
            : listRes.surveyFormAccess;
        const existing = listRes.forms.find((f) => f.type === type);

        if (formAccess === "restricted") {
          router.replace("/event/form");
          return;
        }

        if (formAccess === "view_only") {
          if (!existing) {
            router.replace("/event/form");
            return;
          }
          applyServerRecord(existing);
          setCanEdit(false);
          setPreviewOnly(true);
          setIsPreview(true);
          return;
        }

        if (existing) {
          applyServerRecord(existing);
        }
      } catch (err) {
        if (!cancelled) {
          showToast({
            title: resolveErrorMessage(err, t("loadError")),
            variant: "error",
          });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadInitial();
    return () => {
      cancelled = true;
    };
  }, [applyServerRecord, resolveErrorMessage, router, t, type, user]);

  useEffect(() => {
    const updatePosition = () => {
      const activeEl = sectionRefs.current[activeSectionId];
      if (activeEl) {
        setToolbarTop(activeEl.offsetTop);
      } else if (sectionRefs.current["header"]) {
        setToolbarTop(sectionRefs.current["header"]!.offsetTop);
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [activeSectionId, form.questions, hasEnglish, mobileTab]);

  const buildPayloadForApi = (currentForm: Form, isUpdate: boolean): Form => {
    const fallbackTitle =
      type === "registration" ? t("registration") : t("survey");
    const thTitle = currentForm.head.th.title.trim() || fallbackTitle;
    const enTitle = hasEnglish
      ? currentForm.head.en.title.trim() || thTitle
      : thTitle;
    const thDesc = currentForm.head.th.description;
    const enDesc = hasEnglish ? currentForm.head.en.description : thDesc;

    const mappedQuestions: Question[] = currentForm.questions.map(
      (item, qIdx) => {
        const q = item.question;
        const keepQuestionId =
          isUpdate && q.id && serverQuestionIdsRef.current.has(q.id)
            ? q.id
            : undefined;

        const thLbl = q.label.th[0];
        const enLbl = hasEnglish ? q.label.en[0] : thLbl;
        const isChoiceType = PERSISTED_CHOICE_TYPES.has(q.type);

        const mapChoiceList = (list: Choice[]): Choice[] =>
          isChoiceType
            ? list.map((c, cIdx) => {
                const keepChoiceId =
                  Boolean(keepQuestionId) &&
                  c.id &&
                  serverChoiceIdsRef.current.has(c.id)
                    ? c.id
                    : undefined;
                return {
                  ...(keepChoiceId ? { id: keepChoiceId } : {}),
                  label: c.label,
                  display_order: cIdx + 1,
                };
              })
            : [];

        const apiThChoices = mapChoiceList(thLbl.choices.th);
        const apiEnChoices = mapChoiceList(
          hasEnglish ? enLbl.choices.en : thLbl.choices.th,
        );
        const apiChoicesPair = { en: apiEnChoices, th: apiThChoices };

        const minNum =
          q.type === "rating"
            ? q.min_number
            : q.type === "number"
              ? (q.min_value ?? 0)
              : 0;
        const maxNum =
          q.type === "rating"
            ? q.max_number || q.rating_max || 5
            : q.type === "number"
              ? (q.max_value ?? 0)
              : 0;

        return {
          question: {
            ...(keepQuestionId ? { id: keepQuestionId } : {}),
            type: q.type,
            display_order: qIdx + 1,
            min_number: minNum,
            max_number: maxNum,
            min_value: q.min_value ?? null,
            max_value: q.max_value ?? null,
            min_length: q.min_length,
            max_length: q.max_length,
            is_required: q.is_required,
            is_unique: q.is_unique,
            rating_display: q.rating_display,
            rating_icon: q.rating_icon,
            rating_max: q.rating_max || 5,
            label: {
              en: [
                {
                  label: enLbl.label,
                  placeholder: enLbl.placeholder,
                  scale_min_label: enLbl.scale_min_label ?? "",
                  scale_max_label: enLbl.scale_max_label ?? "",
                  choices: apiChoicesPair,
                },
              ],
              th: [
                {
                  label: thLbl.label,
                  placeholder: thLbl.placeholder,
                  scale_min_label: thLbl.scale_min_label ?? "",
                  scale_max_label: thLbl.scale_max_label ?? "",
                  choices: apiChoicesPair,
                },
              ],
            },
          },
        };
      },
    );

    return {
      ...(isUpdate && formId ? { id: formId } : {}),
      type: currentForm.type,
      head: {
        en: { title: enTitle, description: enDesc },
        th: { title: thTitle, description: thDesc },
      },
      opens_at: toApiIsoDateTime(currentForm.opens_at),
      closes_at: toApiIsoDateTime(currentForm.closes_at),
      questions: mappedQuestions,
    };
  };

  const handleSave = async (silent = false): Promise<FormRecord | null> => {
    if (!eventId) return null;
    setIsSaving(true);

    try {
      let saved: FormRecord;
      if (!formId) {
        const payload = buildPayloadForApi(form, false);
        saved = await api.post<FormRecord>("/event/forms", {
          ...payload,
          eventId,
        });
      } else {
        try {
          const payload = buildPayloadForApi(form, true);
          saved = await api.put<FormRecord>(`/event/forms/${formId}`, payload);
        } catch (putErr) {
          if (
            putErr instanceof ApiError &&
            (putErr.status === 404 ||
              putErr.code === "FORM_NOT_FOUND" ||
              putErr.code === "QUESTION_NOT_OWNED_BY_FORM" ||
              putErr.code === "OPTION_NOT_OWNED_BY_QUESTION")
          ) {
            const createPayload = buildPayloadForApi(form, false);
            saved = await api.post<FormRecord>("/event/forms", {
              ...createPayload,
              eventId,
            });
          } else {
            showToast({
              title: resolveErrorMessage(putErr, tbuilder("saveError")),
              variant: "error",
            });
            return null;
          }
        }
      }

      applyServerRecord(saved, true);
      if (!silent) {
        showToast({ title: tbuilder("saveSuccess"), variant: "success" });
      }
      return saved;
    } catch (err) {
      showToast({
        title: resolveErrorMessage(err, tbuilder("saveError")),
        variant: "error",
      });
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleSchedule = async () => {
    if (
      formStatus === "draft" &&
      !form.opens_at?.trim() &&
      !form.closes_at?.trim()
    ) {
      showToast({
        title: tbuilder("scheduleRequiredError"),
        variant: "warning",
      });
      setActiveSectionId("header");
      return;
    }

    setIsSaving(true);
    try {
      let targetId = formId;
      if (formStatus === "draft") {
        // Save latest draft edits before transitioning to scheduled
        const saved = await handleSave(true);
        if (!saved) return;
        targetId = saved.id;
      }
      if (!targetId) return;

      const nextStatus = formStatus === "draft" ? "scheduled" : "draft";
      const updated = await api.patch<FormRecord>(
        `/event/forms/${targetId}/status`,
        {
          status: nextStatus,
          opensAt: toApiIsoDateTime(form.opens_at),
          closesAt: toApiIsoDateTime(form.closes_at),
        },
      );

      applyServerRecord(updated, true);
      showToast({
        title:
          nextStatus === "scheduled"
            ? tbuilder("scheduleSuccess")
            : tbuilder("revertSuccess"),
        variant: "success",
      });
    } catch (err) {
      showToast({
        title: resolveErrorMessage(err, tbuilder("saveError")),
        variant: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Duplicate all current Thai (`th`) text values into English (`en`)
   * while preserving shared option IDs, then open the English column.
   */
  const addEnglishLanguage = () => {
    setForm((prev) => ({
      ...prev,
      head: {
        th: { ...prev.head.th },
        en: {
          title: prev.head.th.title,
          description: prev.head.th.description,
        },
      },
      questions: prev.questions.map((item) => {
        const thLabel = item.question.label.th[0];
        const thChoices = thLabel.choices.th.map((c) => ({ ...c }));
        const duplicatedEnChoices = thChoices.map((c) => ({ ...c }));
        const syncedChoices = {
          th: thChoices,
          en: duplicatedEnChoices,
        };

        return {
          ...item,
          question: {
            ...item.question,
            label: {
              th: [
                {
                  ...thLabel,
                  choices: syncedChoices,
                },
              ],
              en: [
                {
                  label: thLabel.label,
                  placeholder: thLabel.placeholder,
                  scale_min_label: thLabel.scale_min_label ?? "",
                  scale_max_label: thLabel.scale_max_label ?? "",
                  choices: syncedChoices,
                },
              ],
            },
          },
        };
      }),
    }));
    setHasEnglish(true);
    setMobileTab("en");
  };

  const removeEnglishLanguage = () => {
    setForm((prev) => ({
      ...prev,
      head: {
        th: { ...prev.head.th },
        en: { ...prev.head.th },
      },
      questions: prev.questions.map((item) => {
        const thLabel = item.question.label.th[0];
        const thChoices = thLabel.choices.th.map((c) => ({ ...c }));
        const syncedChoices = {
          th: thChoices,
          en: thChoices.map((c) => ({ ...c })),
        };

        return {
          ...item,
          question: {
            ...item.question,
            label: {
              th: [{ ...thLabel, choices: syncedChoices }],
              en: [{ ...thLabel, choices: syncedChoices }],
            },
          },
        };
      }),
    }));
    setHasEnglish(false);
    setMobileTab("th");
  };

  const addQuestion = () => {
    if (!canEdit) return;
    const newQ = createQuestion(form.questions.length + 1);
    const newId = newQ.question.id!;

    setForm((prev) => {
      const activeIdx = prev.questions.findIndex(
        (item) => item.question.id === activeSectionId,
      );
      const insertAt =
        activeIdx >= 0 ? activeIdx + 1 : prev.questions.length;

      const nextQuestions = [
        ...prev.questions.slice(0, insertAt),
        newQ,
        ...prev.questions.slice(insertAt),
      ].map((item, idx) => ({
        ...item,
        question: {
          ...item.question,
          display_order: idx + 1,
        },
      }));

      return {
        ...prev,
        questions: nextQuestions,
      };
    });

    setActiveSectionId(newId);
  };

  const duplicateQuestion = (id: string) => {
    if (!canEdit) return;
    const targetIdx = form.questions.findIndex(
      (item) => item.question.id === id,
    );
    if (targetIdx === -1) return;

    const source = form.questions[targetIdx].question;
    const newId = crypto.randomUUID();
    const thSrc = source.label.th[0];
    const enSrc = source.label.en[0];

    const optionCount = Math.max(
      thSrc.choices.th.length,
      enSrc.choices.en.length,
    );
    const newThChoices: Choice[] = [];
    const newEnChoices: Choice[] = [];

    for (let i = 0; i < optionCount; i += 1) {
      const sharedChoiceId = crypto.randomUUID();
      const thChoice = thSrc.choices.th[i] ?? enSrc.choices.en[i];
      const enChoice = enSrc.choices.en[i] ?? thSrc.choices.th[i];

      newThChoices.push({
        ...thChoice,
        id: sharedChoiceId,
        display_order: i + 1,
      });
      newEnChoices.push({
        ...enChoice,
        id: sharedChoiceId,
        display_order: i + 1,
      });
    }

    const syncedChoices = {
      th: newThChoices,
      en: newEnChoices,
    };

    const duplicated: Question = {
      question: {
        ...source,
        id: newId,
        label: {
          th: [
            {
              ...thSrc,
              choices: syncedChoices,
            },
          ],
          en: [
            {
              ...enSrc,
              choices: syncedChoices,
            },
          ],
        },
      },
    };

    setForm((prev) => {
      const nextQuestions = [
        ...prev.questions.slice(0, targetIdx + 1),
        duplicated,
        ...prev.questions.slice(targetIdx + 1),
      ].map((item, idx) => ({
        ...item,
        question: {
          ...item.question,
          display_order: idx + 1,
        },
      }));

      return {
        ...prev,
        questions: nextQuestions,
      };
    });

    setActiveSectionId(newId);
  };

  const deleteQuestion = (id: string) => {
    if (!canEdit) return;
    const currentIdx = form.questions.findIndex(
      (item) => item.question.id === id,
    );
    const remaining = form.questions.filter((item) => item.question.id !== id);

    setForm((prev) => ({
      ...prev,
      questions: prev.questions
        .filter((item) => item.question.id !== id)
        .map((item, index) => ({
          ...item,
          question: {
            ...item.question,
            display_order: index + 1,
          },
        })),
    }));

    if (remaining.length > 0) {
      const nextIdx = Math.min(currentIdx, remaining.length - 1);
      setActiveSectionId(remaining[nextIdx].question.id!);
    } else {
      setActiveSectionId("header");
    }
  };

  const reorderQuestions = (sourceId: string, targetId: string) => {
    if (!canEdit || sourceId === targetId) return;

    setForm((prev) => {
      const sourceIdx = prev.questions.findIndex(
        (item) => item.question.id === sourceId,
      );
      const targetIdx = prev.questions.findIndex(
        (item) => item.question.id === targetId,
      );
      if (sourceIdx === -1 || targetIdx === -1) return prev;

      const updated = [...prev.questions];
      const [moved] = updated.splice(sourceIdx, 1);
      updated.splice(targetIdx, 0, moved);

      return {
        ...prev,
        questions: updated.map((item, idx) => ({
          ...item,
          question: {
            ...item.question,
            display_order: idx + 1,
          },
        })),
      };
    });

    setActiveSectionId(sourceId);
  };

  const updateQuestion = (id: string, nextType: QuestionType) => {
    if (!canEdit) return;
    const isUniqueEligible = (
      UNIQUE_QUESTION_TYPES as readonly QuestionType[]
    ).includes(nextType);

    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((item) => {
        if (item.question.id !== id) return item;

        const currentThLabel = item.question.label.th[0];
        const needsDefaultChoice =
          CHOICE_QUESTION_TYPES.includes(nextType) &&
          currentThLabel.choices.th.length === 0;

        let nextLabel = item.question.label;
        if (needsDefaultChoice) {
          const pair = createChoicePair(1);
          const syncedChoices = {
            th: [pair.th],
            en: [pair.en],
          };
          nextLabel = {
            th: item.question.label.th.map((q, idx) =>
              idx === 0 ? { ...q, choices: syncedChoices } : q,
            ),
            en: item.question.label.en.map((q, idx) =>
              idx === 0 ? { ...q, choices: syncedChoices } : q,
            ),
          };
        }

        return {
          ...item,
          question: {
            ...item.question,
            type: nextType,
            is_unique: isUniqueEligible ? item.question.is_unique : false,
            min_number: nextType === "rating" ? 1 : item.question.min_number,
            max_number:
              nextType === "rating"
                ? item.question.max_number || 5
                : item.question.max_number,
            rating_max:
              nextType === "rating"
                ? item.question.rating_max || 5
                : item.question.rating_max,
            max_length:
              nextType === "short_text"
                ? 255
                : nextType === "long_text"
                  ? 5000
                  : 0,
            label: nextLabel,
          },
        };
      }),
    }));
  };

  const toggleRequired = (id: string) => {
    if (!canEdit) return;
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((item) =>
        item.question.id === id
          ? {
              ...item,
              question: {
                ...item.question,
                is_required: !item.question.is_required,
              },
            }
          : item,
      ),
    }));
  };

  const toggleUnique = (id: string) => {
    if (!canEdit) return;
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((item) =>
        item.question.id === id
          ? {
              ...item,
              question: {
                ...item.question,
                is_unique: !item.question.is_unique,
              },
            }
          : item,
      ),
    }));
  };

  const updateQuestionRange = (id: string, min: number, max: number) => {
    if (!canEdit) return;
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((item) =>
        item.question.id === id
          ? {
              ...item,
              question: {
                ...item.question,
                min_number: min,
                max_number: max,
                rating_max: max,
              },
            }
          : item,
      ),
    }));
  };

  const updateQuestionNumberBounds = (
    id: string,
    min: number | null,
    max: number | null,
  ) => {
    if (!canEdit) return;
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((item) =>
        item.question.id === id
          ? {
              ...item,
              question: {
                ...item.question,
                min_value: min,
                max_value: max,
                min_number: min ?? 0,
                max_number: max ?? 0,
              },
            }
          : item,
      ),
    }));
  };

  const updateQuestionRatingDisplay = (
    id: string,
    ratingDisplay: RATING_DISPLAY,
  ) => {
    if (!canEdit) return;
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((item) =>
        item.question.id === id
          ? {
              ...item,
              question: {
                ...item.question,
                rating_display: ratingDisplay,
              },
            }
          : item,
      ),
    }));
  };

  const updateQuestionRatingIcon = (id: string, ratingIcon: ICON) => {
    if (!canEdit) return;
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((item) =>
        item.question.id === id
          ? {
              ...item,
              question: {
                ...item.question,
                rating_icon: ratingIcon,
              },
            }
          : item,
      ),
    }));
  };

  const updateQuestionLinearLabels = (
    id: string,
    locale: FormLocale,
    minLabel: string,
    maxLabel: string,
  ) => {
    if (!canEdit) return;
    const mirrorToEnglish = !hasEnglish && locale === "th";

    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((item) => {
        if (item.question.id !== id) return item;

        const baseChoices = item.question.label.th[0].choices;
        const nextThChoices =
          locale === "th"
            ? baseChoices.th.map((c, idx) =>
                idx === 0
                  ? {
                      ...c,
                      scale_min_label: minLabel,
                      scale_max_label: maxLabel,
                    }
                  : c,
              )
            : baseChoices.th;

        const nextEnChoices =
          locale === "en" || mirrorToEnglish
            ? baseChoices.en.map((c, idx) =>
                idx === 0
                  ? {
                      ...c,
                      scale_min_label: minLabel,
                      scale_max_label: maxLabel,
                    }
                  : c,
              )
            : baseChoices.en;

        const syncedChoices = {
          th: nextThChoices,
          en: nextEnChoices,
        };

        return {
          ...item,
          question: {
            ...item.question,
            label: {
              th: item.question.label.th.map((l, idx) =>
                idx === 0
                  ? {
                      ...l,
                      ...(locale === "th"
                        ? {
                            scale_min_label: minLabel,
                            scale_max_label: maxLabel,
                          }
                        : {}),
                      choices: syncedChoices,
                    }
                  : l,
              ),
              en: item.question.label.en.map((l, idx) =>
                idx === 0
                  ? {
                      ...l,
                      ...(locale === "en" || mirrorToEnglish
                        ? {
                            scale_min_label: minLabel,
                            scale_max_label: maxLabel,
                          }
                        : {}),
                      choices: syncedChoices,
                    }
                  : l,
              ),
            },
          },
        };
      }),
    }));
  };

  const addChoice = (questionId: string) => {
    if (!canEdit) return;
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((item) => {
        if (item.question.id !== questionId) return item;

        const baseChoices = item.question.label.th[0].choices;
        const nextOrder = baseChoices.th.length + 1;
        const pair = createChoicePair(nextOrder);
        const syncedChoices = {
          th: [...baseChoices.th, pair.th],
          en: [...baseChoices.en, pair.en],
        };

        return {
          ...item,
          question: {
            ...item.question,
            label: {
              th: item.question.label.th.map((q, idx) =>
                idx === 0 ? { ...q, choices: syncedChoices } : q,
              ),
              en: item.question.label.en.map((q, idx) =>
                idx === 0 ? { ...q, choices: syncedChoices } : q,
              ),
            },
          },
        };
      }),
    }));
  };

  const updateChoice = (
    questionId: string,
    locale: FormLocale,
    choiceId: string,
    newLabel: string,
  ) => {
    if (!canEdit) return;
    const mirrorToEnglish = !hasEnglish && locale === "th";

    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((item) => {
        if (item.question.id !== questionId) return item;

        const baseChoices = item.question.label.th[0].choices;
        const nextThChoices =
          locale === "th"
            ? baseChoices.th.map((c) =>
                c.id === choiceId ? { ...c, label: newLabel } : c,
              )
            : baseChoices.th;
        const nextEnChoices =
          locale === "en" || mirrorToEnglish
            ? baseChoices.en.map((c) =>
                c.id === choiceId ? { ...c, label: newLabel } : c,
              )
            : baseChoices.en;

        const syncedChoices = {
          th: nextThChoices,
          en: nextEnChoices,
        };

        return {
          ...item,
          question: {
            ...item.question,
            label: {
              th: item.question.label.th.map((q, idx) =>
                idx === 0 ? { ...q, choices: syncedChoices } : q,
              ),
              en: item.question.label.en.map((q, idx) =>
                idx === 0 ? { ...q, choices: syncedChoices } : q,
              ),
            },
          },
        };
      }),
    }));
  };

  const deleteChoice = (questionId: string, choiceId: string) => {
    if (!canEdit) return;
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((item) => {
        if (item.question.id !== questionId) return item;

        const baseChoices = item.question.label.th[0].choices;
        const nextThChoices = baseChoices.th
          .filter((c) => c.id !== choiceId)
          .map((c, idx) => ({ ...c, display_order: idx + 1 }));
        const nextEnChoices = baseChoices.en
          .filter((c) => c.id !== choiceId)
          .map((c, idx) => ({ ...c, display_order: idx + 1 }));

        const syncedChoices = {
          th: nextThChoices,
          en: nextEnChoices,
        };

        return {
          ...item,
          question: {
            ...item.question,
            label: {
              th: item.question.label.th.map((q, idx) =>
                idx === 0 ? { ...q, choices: syncedChoices } : q,
              ),
              en: item.question.label.en.map((q, idx) =>
                idx === 0 ? { ...q, choices: syncedChoices } : q,
              ),
            },
          },
        };
      }),
    }));
  };

  const reorderChoice = (
    questionId: string,
    sourceChoiceId: string,
    targetChoiceId: string,
  ) => {
    if (!canEdit || sourceChoiceId === targetChoiceId) return;

    const moveChoiceInList = (list: Choice[]): Choice[] => {
      const next = [...list];
      const sourceIdx = next.findIndex((c) => c.id === sourceChoiceId);
      const targetIdx = next.findIndex((c) => c.id === targetChoiceId);
      if (sourceIdx === -1 || targetIdx === -1) return list;

      const [moved] = next.splice(sourceIdx, 1);
      next.splice(targetIdx, 0, moved);
      return next.map((c, idx) => ({ ...c, display_order: idx + 1 }));
    };

    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((item) => {
        if (item.question.id !== questionId) return item;

        const baseChoices = item.question.label.th[0].choices;
        const syncedChoices = {
          th: moveChoiceInList(baseChoices.th),
          en: moveChoiceInList(baseChoices.en),
        };

        return {
          ...item,
          question: {
            ...item.question,
            label: {
              th: item.question.label.th.map((q, idx) =>
                idx === 0 ? { ...q, choices: syncedChoices } : q,
              ),
              en: item.question.label.en.map((q, idx) =>
                idx === 0 ? { ...q, choices: syncedChoices } : q,
              ),
            },
          },
        };
      }),
    }));
  };

  const setTitle = (locale: FormLocale, title: string) => {
    if (!canEdit) return;
    const mirrorToEnglish = !hasEnglish && locale === "th";

    setForm((prev) => ({
      ...prev,
      head: {
        ...prev.head,
        [locale]: {
          ...prev.head[locale],
          title,
        },
        ...(mirrorToEnglish
          ? {
              en: {
                ...prev.head.en,
                title,
              },
            }
          : {}),
      },
    }));
  };

  const setDescription = (locale: FormLocale, description: string) => {
    if (!canEdit) return;
    const mirrorToEnglish = !hasEnglish && locale === "th";

    setForm((prev) => ({
      ...prev,
      head: {
        ...prev.head,
        [locale]: {
          ...prev.head[locale],
          description,
        },
        ...(mirrorToEnglish
          ? {
              en: {
                ...prev.head.en,
                description,
              },
            }
          : {}),
      },
    }));
  };

  const setOpensAt = (opensAt: string) => {
    if (!canEdit) return;
    setForm((prev) => ({
      ...prev,
      opens_at: opensAt,
    }));
  };

  const setClosesAt = (closesAt: string) => {
    if (!canEdit) return;
    setForm((prev) => ({
      ...prev,
      closes_at: closesAt,
    }));
  };

  const setQuestionLabel = (
    id: string,
    locale: FormLocale,
    nextLabel: string,
  ) => {
    if (!canEdit) return;
    const mirrorToEnglish = !hasEnglish && locale === "th";

    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((item) => {
        if (item.question.id !== id) return item;

        return {
          ...item,
          question: {
            ...item.question,
            label: {
              ...item.question.label,
              [locale]: item.question.label[locale].map((q, index) =>
                index === 0 ? { ...q, label: nextLabel } : q,
              ),
              ...(mirrorToEnglish
                ? {
                    en: item.question.label.en.map((q, index) =>
                      index === 0 ? { ...q, label: nextLabel } : q,
                    ),
                  }
                : {}),
            },
          },
        };
      }),
    }));
  };

  if (isLoading) {
    return <FormBuilderSkeleton title={t("title") + t(type)} />;
  }

  if (isPreview) {
    return (
      <FormPreview
        form={form}
        hasEnglish={hasEnglish}
        allowEdit={!previewOnly}
        onExitPreview={() => {
          if (previewOnly) {
            router.push("/event/form");
            return;
          }
          setIsPreview(false);
        }}
      />
    );
  }

  const localesToRender: FormLocale[] = hasEnglish ? ["th", "en"] : ["th"];
  const containerWidthClass = hasEnglish
    ? "max-w-4xl lg:max-w-7xl"
    : "max-w-4xl";

  return (
    <div className="font-outfit min-h-screen px-3 pt-4 pb-24 text-gray-800 sm:px-6 sm:pt-6 md:p-8 md:pt-10 dark:bg-gray-950 dark:text-gray-100">
      {/* Header Area */}
      <div
        className={`mx-auto mb-6 flex ${containerWidthClass} flex-wrap items-center justify-between gap-3 md:mb-8`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold sm:text-2xl md:text-3xl text-white">
            {t("title") + t(type)}
          </h1>
          <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
            {formId ? t(`status.${formStatus}`) : t("status.draft")}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:me-16">
          {!hasEnglish && canEdit && (
            <button
              type="button"
              onClick={addEnglishLanguage}
              className="flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3.5 py-2 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-300 dark:hover:bg-brand-500/25"
            >
              <PlusIcon className="h-4 w-4" />
              <UsFlagIcon className="size-4 rounded-sm" />
              <span>{tbuilder("addEnglish")}</span>
            </button>
          )}

          {canEdit && (
            <button
              type="button"
              disabled={isSaving || isLoading || !eventId}
              onClick={() => void handleSave()}
              className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-theme-xs transition-colors hover:bg-brand-600 disabled:opacity-50"
            >
              <CheckCircleIcon className="h-4 w-4" />
              <span>{isSaving ? tbuilder("saving") : tbuilder("save")}</span>
            </button>
          )}

          {canChangeStatus && (formId || canEdit) && (
            <button
              type="button"
              disabled={isSaving || isLoading || !eventId}
              onClick={() => void handleToggleSchedule()}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <ArrowPathIcon className="h-4 w-4" />
              <span>
                {formStatus === "draft"
                  ? tbuilder("schedule")
                  : tbuilder("revertToDraft")}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsPreview(true)}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-brand-50 hover:text-brand-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-brand-500/15 dark:hover:text-brand-400"
          >
            <EyeIcon className="h-4 w-4" />
            <span>{t("preview.button")}</span>
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            {tcommon("back")}
          </button>
        </div>
      </div>

      {/* Locked Notice */}
      {!canEdit && (
        <div
          className={`mx-auto mb-4 flex ${containerWidthClass} items-center gap-2 rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm font-medium text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/15 dark:text-warning-300`}
        >
          <LockClosedIcon className="h-5 w-5 shrink-0" />
          <span>{tbuilder("lockedNotice")}</span>
        </div>
      )}

      <div
        className={`relative mx-auto flex ${containerWidthClass} items-start gap-4`}
      >
        {/* Main Content Area */}
        <div className="relative flex min-w-0 flex-1 flex-col gap-4">
          {/* Language Switcher Tabs on Small Screens (< lg) & Column Header Bar on Desktop (>= lg) */}
          {hasEnglish && (
            <>
              {/* Small Screens (< lg): TH / EN Tabs */}
              <div className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white p-1.5 shadow-theme-xs lg:hidden dark:border-gray-800 dark:bg-gray-900">
                <div
                  role="tablist"
                  aria-label="Form languages"
                  className="grid flex-1 grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mobileTab === "th"}
                    onClick={() => setMobileTab("th")}
                    className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-all sm:text-sm ${
                      mobileTab === "th"
                        ? "bg-white text-brand-600 shadow-theme-xs dark:bg-gray-900 dark:text-brand-400"
                        : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                    }`}
                  >
                    <ThFlagIcon className="size-4 shrink-0 rounded-sm" />
                    <span className="truncate">{tbuilder("langThai")}</span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={mobileTab === "en"}
                    onClick={() => setMobileTab("en")}
                    className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-all sm:text-sm ${
                      mobileTab === "en"
                        ? "bg-white text-brand-600 shadow-theme-xs dark:bg-gray-900 dark:text-brand-400"
                        : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                    }`}
                  >
                    <UsFlagIcon className="size-4 shrink-0 rounded-sm" />
                    <span className="truncate">{tbuilder("langEnglish")}</span>
                  </button>
                </div>

                {canEdit && (
                  <button
                    type="button"
                    onClick={removeEnglishLanguage}
                    title={tbuilder("removeEnglish")}
                    aria-label={tbuilder("removeEnglish")}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium text-gray-500 transition-colors hover:bg-error-50 hover:text-error-600 dark:text-gray-400 dark:hover:bg-error-500/15 dark:hover:text-error-400"
                  >
                    <XMarkIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {tbuilder("removeEnglish")}
                    </span>
                  </button>
                )}
              </div>

              {/* Desktop (>= lg): 2-Column Language Header Bar */}
              <div className="hidden gap-4 lg:grid lg:grid-cols-2">
                <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
                    <ThFlagIcon className="size-4 rounded-sm" />
                    <span>{tbuilder("langThai")}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
                    <UsFlagIcon className="size-4 rounded-sm" />
                    <span>{tbuilder("langEnglish")}</span>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={removeEnglishLanguage}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-error-50 hover:text-error-600 dark:text-gray-400 dark:hover:bg-error-500/15 dark:hover:text-error-400"
                    >
                      <XMarkIcon className="h-4 w-4" />
                      <span>{tbuilder("removeEnglish")}</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {/* 1. Title & Description Row */}
          <fieldset disabled={!canEdit} className="contents">
            <div
              ref={(el) => {
                sectionRefs.current["header"] = el;
              }}
              className={`grid grid-cols-1 gap-4 ${
                hasEnglish ? "lg:grid-cols-2" : ""
              }`}
            >
            {localesToRender.map((loc) => (
              <div
                key={`header-${loc}`}
                className={
                  hasEnglish && mobileTab !== loc
                    ? "hidden h-full lg:block"
                    : "block h-full"
                }
              >
                <FormHeaderCard
                  locale={loc}
                  showLocaleBadge
                  title={form.head[loc].title}
                  description={form.head[loc].description}
                  opensAt={form.opens_at ?? ""}
                  closesAt={form.closes_at ?? ""}
                  isActive={activeSectionId === "header"}
                  onSelect={() => setActiveSectionId("header")}
                  onChangeTitle={(val) => setTitle(loc, val)}
                  onChangeDescription={(val) => setDescription(loc, val)}
                  onChangeOpensAt={setOpensAt}
                  onChangeClosesAt={setClosesAt}
                />
              </div>
            ))}
          </div>

          {/* 2. Question Rows (Paired TH + EN move & reorder together) */}
          {form.questions.map((item) => {
            const question = item.question;
            const qId = question.id!;
            const isRowDragging = draggedQuestionId === qId;
            const isRowDragOver =
              dragOverQuestionId === qId && draggedQuestionId !== qId;

            return (
              <div
                key={qId}
                ref={(el) => {
                  sectionRefs.current[qId] = el;
                }}
                draggable={canEdit}
                onDragStart={(e) => {
                  if (!canEdit) {
                    e.preventDefault();
                    return;
                  }
                  const target = e.target as HTMLElement;
                  if (
                    target.closest("input, textarea, select, button, label")
                  ) {
                    e.preventDefault();
                    return;
                  }
                  setDraggedQuestionId(qId);
                  setActiveSectionId(qId);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  if (!draggedQuestionId) return;
                  e.preventDefault();
                  if (draggedQuestionId !== qId) {
                    setDragOverQuestionId(qId);
                  }
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    if (dragOverQuestionId === qId) {
                      setDragOverQuestionId(null);
                    }
                  }
                }}
                onDrop={(e) => {
                  if (!draggedQuestionId) return;
                  e.preventDefault();
                  if (draggedQuestionId !== qId) {
                    reorderQuestions(draggedQuestionId, qId);
                  }
                  setDraggedQuestionId(null);
                  setDragOverQuestionId(null);
                }}
                onDragEnd={() => {
                  setDraggedQuestionId(null);
                  setDragOverQuestionId(null);
                }}
                className={`grid grid-cols-1 gap-4 ${
                  hasEnglish ? "lg:grid-cols-2" : ""
                }`}
              >
                {localesToRender.map((loc) => (
                  <div
                    key={`${qId}-${loc}`}
                    className={
                      hasEnglish && mobileTab !== loc
                        ? "hidden h-full lg:block"
                        : "block h-full"
                    }
                  >
                    <QuestionCard
                      question={question}
                      locale={loc}
                      showLocaleBadge={hasEnglish}
                      isActive={activeSectionId === qId}
                      isDragging={isRowDragging}
                      isDragOver={isRowDragOver}
                      draggedChoiceId={
                        draggedChoice?.questionId === qId
                          ? draggedChoice.choiceId
                          : null
                      }
                      dragOverChoiceId={
                        dragOverChoice?.questionId === qId
                          ? dragOverChoice.choiceId
                          : null
                      }
                      onSelect={() => setActiveSectionId(qId)}
                      onChoiceDragStart={(choiceId) => {
                        setDraggedChoice({ questionId: qId, choiceId });
                        setActiveSectionId(qId);
                      }}
                      onChoiceDragOver={(choiceId) => {
                        if (
                          draggedChoice?.questionId === qId &&
                          draggedChoice.choiceId !== choiceId
                        ) {
                          setDragOverChoice({ questionId: qId, choiceId });
                        }
                      }}
                      onChoiceDragLeave={(choiceId) => {
                        if (
                          dragOverChoice?.questionId === qId &&
                          dragOverChoice.choiceId === choiceId
                        ) {
                          setDragOverChoice(null);
                        }
                      }}
                      onChoiceDragEnd={() => {
                        setDraggedChoice(null);
                        setDragOverChoice(null);
                      }}
                      onChangeLabel={(val) => setQuestionLabel(qId, loc, val)}
                      onChangeType={(nextType) => updateQuestion(qId, nextType)}
                      onToggleRequired={() => toggleRequired(qId)}
                      onToggleUnique={() => toggleUnique(qId)}
                      onDuplicate={() => duplicateQuestion(qId)}
                      onDelete={() => deleteQuestion(qId)}
                      onAddChoice={() => addChoice(qId)}
                      onUpdateChoice={(choiceId, val) =>
                        updateChoice(qId, loc, choiceId, val)
                      }
                      onDeleteChoice={(choiceId) => deleteChoice(qId, choiceId)}
                      onReorderChoice={(sourceId, targetId) =>
                        reorderChoice(qId, sourceId, targetId)
                      }
                      onUpdateRange={(min, max) =>
                        updateQuestionRange(qId, min, max)
                      }
                      onUpdateNumberBounds={(min, max) =>
                        updateQuestionNumberBounds(qId, min, max)
                      }
                      onUpdateRatingDisplay={(display) =>
                        updateQuestionRatingDisplay(qId, display)
                      }
                      onUpdateRatingIcon={(icon) =>
                        updateQuestionRatingIcon(qId, icon)
                      }
                      onUpdateLinearLabels={(minLabel, maxLabel) =>
                        updateQuestionLinearLabels(qId, loc, minLabel, maxLabel)
                      }
                    />
                  </div>
                ))}
              </div>
            );
          })}
          </fieldset>
        </div>

        {/* 3. Floating Sidebar (Right on Desktop, Bottom Bar on Mobile) */}
        {canEdit && (
          <FloatingToolbar topOffset={toolbarTop} onAddQuestion={addQuestion} />
        )}
      </div>
    </div>
  );
}

function FormBuilderSkeleton({ title }: { title: string }) {
  return (
    <div
      className="font-outfit min-h-screen px-3 pt-4 pb-24 text-gray-800 sm:px-6 sm:pt-6 md:p-8 md:pt-10 dark:bg-gray-950 dark:text-gray-100"
      aria-busy="true"
    >
      <div className="mx-auto mb-6 flex max-w-4xl flex-wrap items-center justify-between gap-3 md:mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold sm:text-2xl md:text-3xl">
            {title}
          </h1>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>

        <div className="flex flex-wrap items-center gap-2 md:me-16">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-20 rounded-lg" />
        </div>
      </div>

      <div className="relative mx-auto flex max-w-4xl items-start gap-4">
        <div className="relative flex min-w-0 flex-1 flex-col gap-4">
          {/* Header Card Skeleton */}
          <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white px-4 pt-6 pb-5 shadow-theme-xs sm:px-6 sm:pt-8 dark:border-gray-800 dark:bg-gray-900">
            <div className="absolute top-0 start-0 h-2 w-full bg-brand-500" />
            <Skeleton className="mb-3 h-6 w-24 rounded-full" />
            <Skeleton className="h-8 w-64 max-w-full" />
            <Skeleton className="mt-3 h-5 w-96 max-w-full" />
            <div className="mt-4 grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2 sm:gap-4 dark:border-gray-800">
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            </div>
          </div>

          {/* Question Cards Skeleton */}
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col rounded-xl border border-gray-200 bg-white px-4 pt-3 pb-4 shadow-theme-xs sm:px-6 sm:pb-6 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="mb-3 flex justify-center">
                <Skeleton className="h-3 w-8" />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Skeleton className="h-11 flex-1 rounded-md" />
                <Skeleton className="h-11 w-full rounded-md sm:w-48" />
              </div>
              <div className="mt-5 sm:mt-6">
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
              <div className="mt-5 flex items-center justify-end gap-3 border-t border-gray-100 pt-3 sm:mt-6 sm:pt-4 dark:border-gray-800">
                <Skeleton className="size-8 rounded-lg" />
                <Skeleton className="size-8 rounded-lg" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
          ))}
        </div>

        <div className="hidden rounded-xl border border-gray-200 bg-white p-1.5 shadow-theme-xs md:flex md:flex-col dark:border-gray-800 dark:bg-gray-900">
          <Skeleton className="size-9 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
