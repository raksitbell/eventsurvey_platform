"use client";

import { ArrowDownIcon, PlusIcon } from "@/icons";
import { useState } from "react";
import {
  Form,
  FormType,
  Question,
  QUESTIONS_TYPES,
  QuestionType,
} from "@/types/event/form";
import { useTranslations } from "next-intl";
export default function FormBuilder({ type }: { type: FormType }) {
  const t = useTranslations("form");
  const tbuilder = useTranslations("form.builder");
  const tcommon = useTranslations("common");

  const createQuestion = (order: number): Question => ({
    question: {
      id: crypto.randomUUID(),
      type: QUESTIONS_TYPES[0] as QuestionType,
      display_order: 0,
      min_number: 0,
      max_number: 0,
      min_length: 0,
      max_length: 0,
      required: false,
      label: {
        en: [
          {
            choices: { en: [], th: [] },
            label: "",
            placeholder: "",
          },
        ],
        th: [
          {
            choices: { en: [], th: [] },
            label: "",
            placeholder: "",
          },
        ],
      },
    },
  });

  const createForm = (): Form => ({
    head: {
      en: {
        title: t("registration"),
        description: tbuilder("description"),
      },
      th: {
        title: t("registration"),
        description: tbuilder("description"),
      },
    },
    type: type,
    questions: [createQuestion(1)],
  });

  const [form, setForm] = useState<Form>(createForm());

  // add Question
  const addQuestion = () => {
    setForm((prev) => ({
      ...prev,
      questions: [...prev.questions, createQuestion(prev.questions.length + 1)],
    }));
  };

  // update Question
  const updateQuestion = (id: string, type: QuestionType) => {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((item) =>
        item.question.id === id
          ? {
              ...item,
              question: {
                ...item.question,
                type: type,
              },
            }
          : item,
      ),
    }));
  };

  // delete Question
  const deleteQuestion = (id: string) => {
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
  };

  // set Title
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

  // set Description
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

  //set Question Label
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
    <div className="font-sans min-h-screen bg-[#F8F9FA] p-8 pt-10 text-gray-800">
      {/* Header Area */}
      <div className="mx-auto mb-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-[#202124]">Form Builder</h1>
      </div>

      <div className="mx-auto flex max-w-4xl items-start gap-4">
        {/* Main Content Area */}
        <div className="flex flex-1 flex-col gap-4">
          {/* 1. Title & Description Box */}
          <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {/* Top Border Line */}
            <div className="absolute top-0 left-0 h-[8px] w-full bg-[#5C54D1]"></div>

            <div className="px-6 pt-10 pb-4">
              <input
                type="text"
                value={form.head.en.title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border-b border-transparent bg-transparent pb-1 text-3xl font-semibold text-gray-800 transition-all placeholder:text-gray-400 hover:border-gray-200 focus:border-b-2 focus:border-[#5C54D1] focus:outline-none"
              />

              <input
                type="text"
                value={form.head.en.description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-2 w-full border-b border-transparent bg-transparent pb-1 text-sm text-gray-600 transition-all placeholder:text-gray-400 hover:border-gray-200 focus:border-b-2 focus:border-[#5C54D1] focus:outline-none"
              />
            </div>
          </div>

          {/* 2. Active Question Box */}
          {form.questions.map((item) => {
            const question = item.question;
            const label = question.label.en[0];

            return (
              <div
                key={question.id}
                className="rounded-xl border-2 border-gray-200 bg-white p-6"
              >
                <div className="flex gap-3">
                  <input
                    type="text"
                    className="min-w-0 flex-1 rounded-md bg-gray-50 p-3"
                    value={label.label}
                    onChange={(e) =>
                      setQuestionLabel(question.id!, e.target.value)
                    }
                  />
                  <select
                    className="w-48 rounded-md bg-gray-50 p-3"
                    value={question.type}
                    onChange={(e) =>
                      updateQuestion(
                        question.id!,
                        e.target.value as QuestionType,
                      )
                    }
                  >
                    {QUESTIONS_TYPES.map((type, key) => {
                      return (
                        <option key={type} className="" value={type}>
                          {tbuilder("choice." + type)}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="mt-6">
                    {question.type === "short_text" && (
                        <input
                            disabled
                            placeholder="short answer text"
                            className="mt-2 w-full border-b border-transparent bg-transparent pb-1 text-sm text-gray-600 transition-all placeholder:text-gray-400 hover:border-gray-200 focus:border-b-2 focus:border-[#5C54D1] focus:outline-none"
                        />
                    )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating Sidebar (Tools) */}
        <aside className="sticky top-10 flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
          <button 
          className="rounded-lg p-3 text-gray-600 transition-colors hover:bg-indigo-50 hover:text-[#5C54D1]"
          onClick={addQuestion}
          >
            
            <PlusIcon />
          </button>
        </aside>
      </div>
    </div>
  );
}
