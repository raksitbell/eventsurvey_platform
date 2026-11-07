"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Form, FormLocale, Question, QuestionType } from "@/types/event/form";
import PreviewTopBar from "./PreviewTopBar";
import PreviewHeaderCard from "./PreviewHeaderCard";
import PreviewQuestionCard, { AnswerValue } from "./PreviewQuestionCard";
import PreviewFooterActions from "./PreviewFooterActions";
import PreviewSubmittedCard from "./PreviewSubmittedCard";

interface FormPreviewProps {
  form: Form;
  hasEnglish?: boolean;
  onExitPreview: () => void;
}

/**
 * Built-in mock existing values so testers can immediately verify `is_unique`
 * duplicate detection in Preview (plus any values submitted during this session).
 */
const MOCK_EXISTING_UNIQUE_BY_TYPE: Partial<Record<QuestionType, string>> = {
  short_text: "admin",
  email: "test@example.com",
  number: "100",
};

function normalizeUniqueValue(raw: string, type: QuestionType): string {
  const trimmed = raw.trim();
  if (type === "number") {
    const num = Number(trimmed);
    return Number.isNaN(num) ? trimmed : String(num);
  }
  return trimmed.toLowerCase();
}

export default function FormPreview({
  form,
  hasEnglish = false,
  onExitPreview,
}: FormPreviewProps) {
  const tPreview = useTranslations("form.preview");

  const [previewLocale, setPreviewLocale] = useState<FormLocale>("th");
  const activeLocale: FormLocale = hasEnglish ? previewLocale : "th";
  const currentHead = form.head[activeLocale];

  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedUniqueValues, setSubmittedUniqueValues] = useState<
    Record<string, string[]>
  >({});

  const hasRequiredQuestion = form.questions.some(
    (item) => item.question.is_required,
  );

  const isDuplicateUniqueValue = (
    q: Question["question"],
    rawVal: string,
  ): boolean => {
    if (!q.is_unique) return false;
    const normalized = normalizeUniqueValue(rawVal, q.type);
    if (!normalized) return false;

    const mockDefault = MOCK_EXISTING_UNIQUE_BY_TYPE[q.type];
    if (
      mockDefault &&
      normalizeUniqueValue(mockDefault, q.type) === normalized
    ) {
      return true;
    }

    const qId = q.id!;
    const sessionSubmitted = submittedUniqueValues[qId] ?? [];
    return sessionSubmitted.includes(normalized);
  };

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
      return q.is_required ? tPreview("requiredError") : null;
    }

    const strVal = String(val).trim();

    if (q.type === "email") {
      if (!strVal.includes("@")) {
        return tPreview("emailError");
      }
    }

    if (q.type === "number") {
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

    if (q.is_unique && isDuplicateUniqueValue(q, strVal)) {
      return tPreview("uniqueError");
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

      if (
        (q.type === "email" || q.type === "number" || q.is_unique) &&
        strVal.length > 0
      ) {
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

    // Record submitted unique values in session so "Submit another response" also catches duplicates
    setSubmittedUniqueValues((prev) => {
      const next = { ...prev };
      form.questions.forEach((item) => {
        const q = item.question;
        const qId = q.id!;
        if (!q.is_unique) return;
        const raw = answers[qId];
        if (raw === undefined || raw === null) return;
        const normalized = normalizeUniqueValue(String(raw), q.type);
        if (!normalized) return;
        const existing = next[qId] ?? [];
        if (!existing.includes(normalized)) {
          next[qId] = [...existing, normalized];
        }
      });
      return next;
    });

    setIsSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (isSubmitted) {
    return (
      <PreviewSubmittedCard
        title={currentHead.title}
        hasEnglish={hasEnglish}
        previewLocale={activeLocale}
        onChangeLocale={setPreviewLocale}
        onResetForm={clearForm}
        onExitPreview={onExitPreview}
      />
    );
  }

  return (
    <div className="font-sans min-h-screen px-3 pt-4 pb-20 text-gray-800 sm:px-6 sm:pt-8 dark:text-gray-100">
      <div className="mx-auto max-w-2xl">
        {/* Top bar to return to editor */}
        <PreviewTopBar
          onExitPreview={onExitPreview}
          hasEnglish={hasEnglish}
          previewLocale={activeLocale}
          onChangeLocale={setPreviewLocale}
        />

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {/* 1. Header Card */}
          <PreviewHeaderCard
            title={currentHead.title}
            description={currentHead.description}
            opensAt={form.opens_at}
            closesAt={form.closes_at}
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
                locale={activeLocale}
                answer={answers[qId]}
                errorMessage={errors[qId]}
                mockUniqueSample={
                  question.is_unique
                    ? MOCK_EXISTING_UNIQUE_BY_TYPE[question.type]
                    : undefined
                }
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
