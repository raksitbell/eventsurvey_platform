"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { EyeIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { ThFlagIcon, UsFlagIcon } from "@/icons";
import {
  Choice,
  Form,
  FormLocale,
  FormType,
  ICON,
  Question,
  QUESTIONS_TYPES,
  QuestionType,
  RATING_DISPLAY,
  UNIQUE_QUESTION_TYPES,
} from "@/types/event/form";
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
  const tcommon = useTranslations("common");
  const router = useRouter();

  const [hasEnglish, setHasEnglish] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<FormLocale>("th");

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
    if (sourceId === targetId) return;

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
    if (sourceChoiceId === targetChoiceId) return;

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
    setForm((prev) => ({
      ...prev,
      opens_at: opensAt,
    }));
  };

  const setClosesAt = (closesAt: string) => {
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

  if (isPreview) {
    return (
      <FormPreview
        form={form}
        hasEnglish={hasEnglish}
        onExitPreview={() => setIsPreview(false)}
      />
    );
  }

  const localesToRender: FormLocale[] = hasEnglish ? ["th", "en"] : ["th"];
  const containerWidthClass = hasEnglish
    ? "max-w-4xl lg:max-w-7xl"
    : "max-w-4xl";

  return (
    <div className="font-outfit min-h-screen bg-gray-50 px-3 pt-4 pb-24 text-gray-800 sm:px-6 sm:pt-6 md:p-8 md:pt-10 dark:bg-gray-950 dark:text-gray-100">
      {/* Header Area */}
      <div
        className={`mx-auto mb-6 flex ${containerWidthClass} flex-wrap items-center justify-between gap-3 md:mb-8`}
      >
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl md:text-3xl dark:text-white">
          {t("title")}
        </h1>

        <div className="flex flex-wrap items-center gap-2 md:me-16">
          {!hasEnglish && (
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
                  <button
                    type="button"
                    onClick={removeEnglishLanguage}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-error-50 hover:text-error-600 dark:text-gray-400 dark:hover:bg-error-500/15 dark:hover:text-error-400"
                  >
                    <XMarkIcon className="h-4 w-4" />
                    <span>{tbuilder("removeEnglish")}</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* 1. Title & Description Row */}
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
                draggable
                onDragStart={(e) => {
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
        </div>

        {/* 3. Floating Sidebar (Right on Desktop, Bottom Bar on Mobile) */}
        <FloatingToolbar topOffset={toolbarTop} onAddQuestion={addQuestion} />
      </div>
    </div>
  );
}
