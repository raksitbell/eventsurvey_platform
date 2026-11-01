"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertIcon,
  CheckCircleIcon,
  PencilIcon,
  ShootingStarIcon,
} from "@/icons";
import { Form } from "@/types/event/form";

interface FormPreviewProps {
  form: Form;
  onExitPreview: () => void;
}

type AnswerValue = string | string[] | number;

export default function FormPreview({ form, onExitPreview }: FormPreviewProps) {
  const tPreview = useTranslations("form.preview");

  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [hoveredRating, setHoveredRating] = useState<Record<string, number>>(
    {},
  );
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const hasRequiredQuestion = form.questions.some(
    (item) => item.question.required,
  );

  const setAnswer = (questionId: string, value: AnswerValue) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
    if (errors[questionId]) {
      setErrors((prev) => ({
        ...prev,
        [questionId]: false,
      }));
    }
  };

  const toggleCheckboxAnswer = (questionId: string, choiceId: string) => {
    const current = (answers[questionId] as string[]) || [];
    const next = current.includes(choiceId)
      ? current.filter((id) => id !== choiceId)
      : [...current, choiceId];
    setAnswer(questionId, next);
  };

  const clearAnswer = (questionId: string) => {
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  };

  const clearForm = () => {
    setAnswers({});
    setErrors({});
    setIsSubmitted(false);
  };

  const isQuestionAnswered = (qId: string): boolean => {
    const val = answers[qId];
    if (val === undefined || val === null) return false;
    if (typeof val === "string") return val.trim().length > 0;
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === "number") return val > 0;
    return false;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, boolean> = {};
    let firstErrorId: string | null = null;

    form.questions.forEach((item) => {
      const q = item.question;
      const qId = q.id!;
      if (q.required && !isQuestionAnswered(qId)) {
        newErrors[qId] = true;
        if (!firstErrorId) {
          firstErrorId = qId;
        }
      }
    });

    setErrors(newErrors);

    if (firstErrorId) {
      const el = document.getElementById(`preview-q-${firstErrorId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setIsSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Submitted confirmation view (Google Form style)
  if (isSubmitted) {
    return (
      <div className="font-sans min-h-screen bg-[#F0EBF8] px-3 pt-4 pb-16 text-gray-800 sm:px-6 sm:pt-8">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={onExitPreview}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            >
              <PencilIcon className="h-4 w-4" />
              <span>{tPreview("editForm")}</span>
            </button>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="absolute top-0 start-0 h-[10px] w-full bg-[#5C54D1]" />

            <div className="flex items-start gap-3 pt-2">
              <CheckCircleIcon className="mt-1 h-7 w-7 shrink-0 text-green-600" />
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl">
                  {form.head.en.title}
                </h1>
                <p className="mt-3 text-sm text-gray-700">
                  {tPreview("submittedDesc")}
                </p>

                <button
                  type="button"
                  onClick={clearForm}
                  className="mt-6 text-sm font-medium text-[#5C54D1] underline hover:text-indigo-800"
                >
                  {tPreview("submitAnother")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="font-sans min-h-screen bg-[#F0EBF8] px-3 pt-4 pb-20 text-gray-800 sm:px-6 sm:pt-8">
      <div className="mx-auto max-w-2xl">
        {/* Top bar to return to editor */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="rounded-full bg-[#5C54D1]/10 px-3 py-1 text-xs font-semibold text-[#5C54D1]">
            {tPreview("button")}
          </span>
          <button
            type="button"
            onClick={onExitPreview}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            <PencilIcon className="h-4 w-4" />
            <span>{tPreview("editForm")}</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {/* 1. Header Card */}
          <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="absolute top-0 start-0 h-[10px] w-full bg-[#5C54D1]" />

            <div className="px-5 pt-8 pb-5 sm:px-7 sm:pt-9">
              <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl">
                {form.head.en.title}
              </h1>
              {form.head.en.description && (
                <p className="mt-2 text-sm whitespace-pre-wrap text-gray-600">
                  {form.head.en.description}
                </p>
              )}

              {hasRequiredQuestion && (
                <div className="mt-4 border-t border-gray-200 pt-3 text-xs font-medium text-red-600">
                  {tPreview("requiredNote")}
                </div>
              )}
            </div>
          </div>

          {/* 2. Question Cards */}
          {form.questions.map((item) => {
            const question = item.question;
            const qId = question.id!;
            const labelObj = question.label.en[0];
            const questionTitle =
              labelObj.label.trim() || tPreview("untitledQuestion");
            const choices = labelObj.choices.en;
            const hasError = !!errors[qId];

            return (
              <div
                key={qId}
                id={`preview-q-${qId}`}
                className={`rounded-xl border bg-white p-5 shadow-sm transition-all sm:p-6 ${
                  hasError ? "border-red-500" : "border-gray-200"
                }`}
              >
                {/* Question Title */}
                <div className="mb-4 text-base font-medium text-gray-900">
                  <span>{questionTitle}</span>
                  {question.required && (
                    <span className="ms-1 text-red-600">*</span>
                  )}
                </div>

                {/* Short Text */}
                {question.type === "short_text" && (
                  <input
                    type="text"
                    value={(answers[qId] as string) || ""}
                    onChange={(e) => setAnswer(qId, e.target.value)}
                    placeholder={tPreview("yourAnswer")}
                    className="w-full max-w-md border-b border-gray-300 bg-transparent pb-1.5 text-sm text-gray-800 transition-colors placeholder:text-gray-400 focus:border-b-2 focus:border-[#5C54D1] focus:outline-none"
                  />
                )}

                {/* Long Text */}
                {question.type === "long_text" && (
                  <textarea
                    rows={3}
                    value={(answers[qId] as string) || ""}
                    onChange={(e) => setAnswer(qId, e.target.value)}
                    placeholder={tPreview("yourAnswer")}
                    className="w-full border-b border-gray-300 bg-transparent pb-1.5 text-sm text-gray-800 transition-colors placeholder:text-gray-400 focus:border-b-2 focus:border-[#5C54D1] focus:outline-none"
                  />
                )}

                {/* Multiple Choice (Radio) */}
                {question.type === "multiple_choice" && (
                  <div className="flex flex-col gap-3">
                    {choices.map((choice) => {
                      const cId = choice.id!;
                      const isChecked = answers[qId] === cId;

                      return (
                        <label
                          key={cId}
                          className="flex cursor-pointer items-center gap-3 text-sm text-gray-800"
                        >
                          <input
                            type="radio"
                            name={`q-${qId}`}
                            checked={isChecked}
                            onChange={() => setAnswer(qId, cId)}
                            className="h-5 w-5 shrink-0 cursor-pointer accent-[#5C54D1]"
                          />
                          <span>{choice.label}</span>
                        </label>
                      );
                    })}

                    {!question.required && answers[qId] && (
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => clearAnswer(qId)}
                          className="rounded px-2 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
                        >
                          {tPreview("clearSelection")}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Checkbox (Multiple selection) */}
                {question.type === "checkbox" && (
                  <div className="flex flex-col gap-3">
                    {choices.map((choice) => {
                      const cId = choice.id!;
                      const selectedList = (answers[qId] as string[]) || [];
                      const isChecked = selectedList.includes(cId);

                      return (
                        <label
                          key={cId}
                          className="flex cursor-pointer items-center gap-3 text-sm text-gray-800"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleCheckboxAnswer(qId, cId)}
                            className="h-5 w-5 shrink-0 cursor-pointer rounded accent-[#5C54D1]"
                          />
                          <span>{choice.label}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Dropdown */}
                {question.type === "dropdown" && (
                  <select
                    value={(answers[qId] as string) || ""}
                    onChange={(e) => setAnswer(qId, e.target.value)}
                    className="w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-800 focus:border-[#5C54D1] focus:outline-none"
                  >
                    <option value="">{tPreview("choose")}</option>
                    {choices.map((choice) => (
                      <option key={choice.id} value={choice.id}>
                        {choice.label}
                      </option>
                    ))}
                  </select>
                )}

                {/* Date Picker */}
                {question.type === "date" && (
                  <input
                    type="date"
                    value={(answers[qId] as string) || ""}
                    onChange={(e) => setAnswer(qId, e.target.value)}
                    className="w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-800 focus:border-[#5C54D1] focus:outline-none"
                  />
                )}

                {/* Time Picker */}
                {question.type === "time" && (
                  <input
                    type="time"
                    value={(answers[qId] as string) || ""}
                    onChange={(e) => setAnswer(qId, e.target.value)}
                    className="w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-800 focus:border-[#5C54D1] focus:outline-none"
                  />
                )}

                {/* Rating (Interactive Stars) */}
                {question.type === "rating" && (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-5 gap-3 pt-2 sm:flex sm:flex-wrap sm:items-center sm:justify-around sm:gap-4">
                      {Array.from(
                        { length: question.max_number || 5 },
                        (_, idx) => idx + 1,
                      ).map((level) => {
                        const selectedRating = (answers[qId] as number) || 0;
                        const activeRating =
                          hoveredRating[qId] ?? selectedRating;
                        const isHighlighted = level <= activeRating;

                        return (
                          <button
                            key={level}
                            type="button"
                            onMouseEnter={() =>
                              setHoveredRating((prev) => ({
                                ...prev,
                                [qId]: level,
                              }))
                            }
                            onMouseLeave={() =>
                              setHoveredRating((prev) => {
                                const next = { ...prev };
                                delete next[qId];
                                return next;
                              })
                            }
                            onClick={() => setAnswer(qId, level)}
                            className="group flex flex-col items-center gap-2 rounded-lg p-2 transition-transform hover:scale-110"
                          >
                            <span
                              className={`text-xs font-medium ${
                                selectedRating === level
                                  ? "font-bold text-[#5C54D1]"
                                  : "text-gray-600"
                              }`}
                            >
                              {level}
                            </span>
                            <ShootingStarIcon
                              className={`h-6 w-6 transition-colors sm:h-7 sm:w-7 ${
                                isHighlighted
                                  ? "text-amber-400"
                                  : "text-gray-300 group-hover:text-amber-200"
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>

                    {!question.required && answers[qId] && (
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => clearAnswer(qId)}
                          className="rounded px-2 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
                        >
                          {tPreview("clearSelection")}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Validation Error Message */}
                {hasError && (
                  <div className="mt-4 flex items-center gap-2 text-xs font-medium text-red-600">
                    <AlertIcon className="h-4 w-4 shrink-0" />
                    <span>{tPreview("requiredError")}</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* 3. Submit & Clear Form Bar */}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <button
              type="submit"
              className="rounded-lg bg-[#5C54D1] px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#4b43b8]"
            >
              {tPreview("submit")}
            </button>

            <button
              type="button"
              onClick={clearForm}
              className="rounded-lg px-3 py-2 text-sm font-medium text-[#5C54D1] transition-colors hover:bg-indigo-50"
            >
              {tPreview("clearForm")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

