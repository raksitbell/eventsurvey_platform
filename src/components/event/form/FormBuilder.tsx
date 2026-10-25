"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  Choice,
  Form,
  FormType,
  Question,
  QUESTIONS_TYPES,
  QuestionType,
} from "@/types/event/form";
import FormHeaderCard from "./FormHeaderCard";
import QuestionCard from "./QuestionCard";
import FloatingToolbar from "./FloatingToolbar";

const CHOICE_QUESTION_TYPES: QuestionType[] = [
  "multiple_choice",
  "checkbox",
  "dropdown",
];

export default function FormBuilder({ type }: { type: FormType }) {
  const t = useTranslations("form");
  const tbuilder = useTranslations("form.builder");
  const tcommon = useTranslations("common");
  const router = useRouter();

  const createChoice = (order: number): Choice => ({
    id: crypto.randomUUID(),
    label: `Option ${order}`,
    display_order: order,
  });

  const createQuestion = (order: number): Question => ({
    question: {
      id: crypto.randomUUID(),
      type: QUESTIONS_TYPES[0] as QuestionType,
      display_order: order,
      min_number: 1,
      max_number: 5,
      min_length: 0,
      max_length: 0,
      required: false,
      label: {
        en: [
          {
            choices: { en: [createChoice(1)], th: [createChoice(1)] },
            label: "",
            placeholder: "",
          },
        ],
        th: [
          {
            choices: { en: [createChoice(1)], th: [createChoice(1)] },
            label: "",
            placeholder: "",
          },
        ],
      },
    },
  });

  const [form, setForm] = useState<Form>(() => {
    const firstQuestion = createQuestion(1);
    return {
      head: {
        en: {
          title: type === "registration" ? t("registration") : t("survey"),
          description: tbuilder("description"),
        },
        th: {
          title: type === "registration" ? t("registration") : t("survey"),
          description: tbuilder("description"),
        },
      },
      type: type,
      questions: [firstQuestion],
    };
  });

  const [activeSectionId, setActiveSectionId] = useState<string>(() =>
    form.questions[0]?.question.id ?? "header",
  );
  const [toolbarTop, setToolbarTop] = useState<number>(0);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [draggedQuestionId, setDraggedQuestionId] = useState<string | null>(
    null,
  );
  const [dragOverQuestionId, setDragOverQuestionId] = useState<string | null>(
    null,
  );

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
  }, [activeSectionId, form.questions]);

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

    const duplicated: Question = {
      question: {
        ...source,
        id: newId,
        label: {
          en: source.label.en.map((l) => ({
            ...l,
            choices: {
              en: l.choices.en.map((c, idx) => ({
                ...c,
                id: crypto.randomUUID(),
                display_order: idx + 1,
              })),
              th: l.choices.th.map((c, idx) => ({
                ...c,
                id: crypto.randomUUID(),
                display_order: idx + 1,
              })),
            },
          })),
          th: source.label.th.map((l) => ({
            ...l,
            choices: {
              en: l.choices.en.map((c, idx) => ({
                ...c,
                id: crypto.randomUUID(),
                display_order: idx + 1,
              })),
              th: l.choices.th.map((c, idx) => ({
                ...c,
                id: crypto.randomUUID(),
                display_order: idx + 1,
              })),
            },
          })),
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
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((item) => {
        if (item.question.id !== id) return item;

        const currentEnLabel = item.question.label.en[0];
        const needsDefaultChoice =
          CHOICE_QUESTION_TYPES.includes(nextType) &&
          currentEnLabel.choices.en.length === 0;

        return {
          ...item,
          question: {
            ...item.question,
            type: nextType,
            min_number: nextType === "rating" ? 1 : item.question.min_number,
            max_number:
              nextType === "rating"
                ? item.question.max_number || 5
                : item.question.max_number,
            label: needsDefaultChoice
              ? {
                  ...item.question.label,
                  en: item.question.label.en.map((q, idx) =>
                    idx === 0
                      ? {
                          ...q,
                          choices: {
                            ...q.choices,
                            en: [createChoice(1)],
                          },
                        }
                      : q,
                  ),
                }
              : item.question.label,
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
                required: !item.question.required,
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
              },
            }
          : item,
      ),
    }));
  };

  const addChoice = (questionId: string) => {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((item) =>
        item.question.id === questionId
          ? {
              ...item,
              question: {
                ...item.question,
                label: {
                  ...item.question.label,
                  en: item.question.label.en.map((q, index) =>
                    index === 0
                      ? {
                          ...q,
                          choices: {
                            ...q.choices,
                            en: [
                              ...q.choices.en,
                              createChoice(q.choices.en.length + 1),
                            ],
                          },
                        }
                      : q,
                  ),
                },
              },
            }
          : item,
      ),
    }));
  };

  const updateChoice = (
    questionId: string,
    choiceId: string,
    newLabel: string,
  ) => {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((item) =>
        item.question.id === questionId
          ? {
              ...item,
              question: {
                ...item.question,
                label: {
                  ...item.question.label,
                  en: item.question.label.en.map((q, index) =>
                    index === 0
                      ? {
                          ...q,
                          choices: {
                            ...q.choices,
                            en: q.choices.en.map((choice) =>
                              choice.id === choiceId
                                ? { ...choice, label: newLabel }
                                : choice,
                            ),
                          },
                        }
                      : q,
                  ),
                },
              },
            }
          : item,
      ),
    }));
  };

  const deleteChoice = (questionId: string, choiceId: string) => {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((item) =>
        item.question.id === questionId
          ? {
              ...item,
              question: {
                ...item.question,
                label: {
                  ...item.question.label,
                  en: item.question.label.en.map((q, index) =>
                    index === 0
                      ? {
                          ...q,
                          choices: {
                            ...q.choices,
                            en: q.choices.en
                              .filter((choice) => choice.id !== choiceId)
                              .map((choice, idx) => ({
                                ...choice,
                                display_order: idx + 1,
                              })),
                          },
                        }
                      : q,
                  ),
                },
              },
            }
          : item,
      ),
    }));
  };

  const reorderChoice = (
    questionId: string,
    sourceChoiceId: string,
    targetChoiceId: string,
  ) => {
    if (sourceChoiceId === targetChoiceId) return;

    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((item) => {
        if (item.question.id !== questionId) return item;

        return {
          ...item,
          question: {
            ...item.question,
            label: {
              ...item.question.label,
              en: item.question.label.en.map((q, index) => {
                if (index !== 0) return q;

                const currentChoices = [...q.choices.en];
                const sourceIdx = currentChoices.findIndex(
                  (c) => c.id === sourceChoiceId,
                );
                const targetIdx = currentChoices.findIndex(
                  (c) => c.id === targetChoiceId,
                );
                if (sourceIdx === -1 || targetIdx === -1) return q;

                const [movedChoice] = currentChoices.splice(sourceIdx, 1);
                currentChoices.splice(targetIdx, 0, movedChoice);

                return {
                  ...q,
                  choices: {
                    ...q.choices,
                    en: currentChoices.map((c, idx) => ({
                      ...c,
                      display_order: idx + 1,
                    })),
                  },
                };
              }),
            },
          },
        };
      }),
    }));
  };

  const setTitle = (title: string) => {
    setForm((prev) => ({
      ...prev,
      head: {
        ...prev.head,
        en: {
          ...prev.head.en,
          title,
        },
      },
    }));
  };

  const setDescription = (description: string) => {
    setForm((prev) => ({
      ...prev,
      head: {
        ...prev.head,
        en: {
          ...prev.head.en,
          description,
        },
      },
    }));
  };

  const setQuestionLabel = (id: string, label: string) => {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((item) =>
        item.question.id === id
          ? {
              ...item,
              question: {
                ...item.question,
                label: {
                  ...item.question.label,
                  en: item.question.label.en.map((q, index) =>
                    index === 0
                      ? {
                          ...q,
                          label: label,
                        }
                      : q,
                  ),
                },
              },
            }
          : item,
      ),
    }));
  };

  return (
    <div className="font-sans min-h-screen bg-[#F8F9FA] px-3 pt-4 pb-24 text-gray-800 sm:px-6 sm:pt-6 md:p-8 md:pt-10">
      {/* Header Area */}
      <div className="mx-auto mb-6 flex max-w-4xl flex-wrap items-center justify-between gap-3 md:mb-8">
        <h1 className="text-xl font-bold text-[#202124] sm:text-2xl md:text-3xl">
          Form Builder
        </h1>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium transition-colors hover:bg-blue-50 md:me-16"
        >
          {tcommon("back")}
        </button>
      </div>

      <div className="relative mx-auto flex max-w-4xl items-start gap-4">
        {/* Main Content Area */}
        <div className="relative flex min-w-0 flex-1 flex-col gap-4">
          {/* 1. Title & Description Box */}
          <FormHeaderCard
            title={form.head.en.title}
            description={form.head.en.description}
            isActive={activeSectionId === "header"}
            sectionRef={(el) => {
              sectionRefs.current["header"] = el;
            }}
            onSelect={() => setActiveSectionId("header")}
            onChangeTitle={setTitle}
            onChangeDescription={setDescription}
          />

          {/* 2. Question Cards */}
          {form.questions.map((item) => {
            const question = item.question;
            const qId = question.id!;

            return (
              <QuestionCard
                key={qId}
                question={question}
                isActive={activeSectionId === qId}
                isDragging={draggedQuestionId === qId}
                isDragOver={
                  dragOverQuestionId === qId && draggedQuestionId !== qId
                }
                sectionRef={(el) => {
                  sectionRefs.current[qId] = el;
                }}
                onSelect={() => setActiveSectionId(qId)}
                onDragStart={() => {
                  setDraggedQuestionId(qId);
                  setActiveSectionId(qId);
                }}
                onDragOver={() => {
                  if (draggedQuestionId && draggedQuestionId !== qId) {
                    setDragOverQuestionId(qId);
                  }
                }}
                onDragLeave={() => {
                  if (dragOverQuestionId === qId) {
                    setDragOverQuestionId(null);
                  }
                }}
                onDrop={() => {
                  if (draggedQuestionId && draggedQuestionId !== qId) {
                    reorderQuestions(draggedQuestionId, qId);
                  }
                  setDraggedQuestionId(null);
                  setDragOverQuestionId(null);
                }}
                onDragEnd={() => {
                  setDraggedQuestionId(null);
                  setDragOverQuestionId(null);
                }}
                onChangeLabel={(val) => setQuestionLabel(qId, val)}
                onChangeType={(nextType) => updateQuestion(qId, nextType)}
                onToggleRequired={() => toggleRequired(qId)}
                onDuplicate={() => duplicateQuestion(qId)}
                onDelete={() => deleteQuestion(qId)}
                onAddChoice={() => addChoice(qId)}
                onUpdateChoice={(choiceId, val) =>
                  updateChoice(qId, choiceId, val)
                }
                onDeleteChoice={(choiceId) => deleteChoice(qId, choiceId)}
                onReorderChoice={(sourceId, targetId) =>
                  reorderChoice(qId, sourceId, targetId)
                }
                onUpdateRange={(min, max) => updateQuestionRange(qId, min, max)}
              />
            );
          })}
        </div>

        {/* 3. Floating Sidebar (Right on Desktop, Bottom Bar on Mobile) */}
        <FloatingToolbar topOffset={toolbarTop} onAddQuestion={addQuestion} />
      </div>
    </div>
  );
}
