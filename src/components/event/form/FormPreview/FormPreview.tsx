"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Form, Question } from "@/types/event/form";
import PreviewTopBar from "./PreviewTopBar";
import PreviewHeaderCard from "./PreviewHeaderCard";
import PreviewQuestionCard, { AnswerValue } from "./PreviewQuestionCard";
import PreviewFooterActions from "./PreviewFooterActions";
import PreviewSubmittedCard from "./PreviewSubmittedCard";

interface FormPreviewProps {
  form: Form;
  onExitPreview: () => void;
}

export default function FormPreview({ form, onExitPreview }: FormPreviewProps) {
  const tPreview = useTranslations("form.preview");

  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const hasRequiredQuestion = form.questions.some(
    (item) => item.question.required,
  );

  const validateQuestion = (
    q: Question["question"],
    val: AnswerValue | undefined,
  ): string | null => {
    const isAnswered = (() => {
      if (val === undefined || val === null) return false;
      if (typeof val === "string") return val.trim().length > 0;
      if (Array.isArray(val)) return val.length > 0;
      if (typeof val === "number") return !Number.isNaN(val);
      return false;
    })();

    if (!isAnswered) {
      return q.required ? tPreview("requiredError") : null;
    }

    if (q.type === "email") {
      const strVal = String(val).trim();
      if (!strVal.includes("@")) {
        return tPreview("emailError");
      }
    }

    if (q.type === "number") {
      const strVal = String(val).trim();
      const num = Number(strVal);
      if (Number.isNaN(num)) {
        return tPreview("numberInvalidError");
      }

      const hasMin = q.min_value !== undefined && q.min_value !== null;
      const hasMax = q.max_value !== undefined && q.max_value !== null;

      if (hasMin && hasMax && (num < q.min_value! || num > q.max_value!)) {
        return tPreview("numberRangeError", {
          min: q.min_value!,
          max: q.max_value!,
        });
      }
      if (hasMin && num < q.min_value!) {
        return tPreview("numberMinError", { min: q.min_value! });
      }
      if (hasMax && num > q.max_value!) {
        return tPreview("numberMaxError", { max: q.max_value! });
      }
    }

    return null;
  };

  const setAnswer = (questionId: string, value: AnswerValue) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));

    const item = form.questions.find((q) => q.question.id === questionId);
    if (item) {
      const q = item.question;
      const strVal = typeof value === "string" ? value.trim() : "";

      if (q.type === "email" && strVal.length > 0 && !strVal.includes("@")) {
        setErrors((prev) => ({
          ...prev,
          [questionId]: tPreview("emailError"),
        }));
        return;
      }

      if (q.type === "number" && strVal.length > 0) {
        const err = validateQuestion(q, value);
        if (err) {
          setErrors((prev) => ({
            ...prev,
            [questionId]: err,
          }));
          return;
        }
      }
    }

    if (errors[questionId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    let firstErrorId: string | null = null;

    form.questions.forEach((item) => {
      const q = item.question;
      const qId = q.id!;
      const err = validateQuestion(q, answers[qId]);
      if (err) {
        newErrors[qId] = err;
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

  if (isSubmitted) {
    return (
      <PreviewSubmittedCard
        title={form.head.en.title}
        onResetForm={clearForm}
        onExitPreview={onExitPreview}
      />
    );
  }

  return (
    <div className="font-sans min-h-screen px-3 pt-4 pb-20 text-gray-800 sm:px-6 sm:pt-8">
      <div className="mx-auto max-w-2xl">
        {/* Top bar to return to editor */}
        <PreviewTopBar onExitPreview={onExitPreview} />

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {/* 1. Header Card */}
          <PreviewHeaderCard
            title={form.head.en.title}
            description={form.head.en.description}
            hasRequiredQuestion={hasRequiredQuestion}
          />

          {/* 2. Question Cards */}
          {form.questions.map((item) => {
            const question = item.question;
            const qId = question.id!;

            return (
              <PreviewQuestionCard
                key={qId}
                question={question}
                answer={answers[qId]}
                errorMessage={errors[qId]}
                onChangeAnswer={(val) => setAnswer(qId, val)}
                onToggleCheckbox={(choiceId) =>
                  toggleCheckboxAnswer(qId, choiceId)
                }
                onClearAnswer={() => clearAnswer(qId)}
              />
            );
          })}

          {/* 3. Submit & Clear Form Bar */}
          <PreviewFooterActions onClearForm={clearForm} />
        </form>
      </div>
    </div>
  );
}
