import { fromBangkokInput } from "@/core/i18n/bangkok-datetime";
import type { FormLocale, Question } from "@/types/event/form";

export type PublicFormAnswer = string | string[] | number;
export type PublicFormAnswerIssue =
  | {
      key:
        "requiredError" | "emailError" | "numberInvalidError" | "invalidAnswer";
    }
  | { key: "numberRangeError"; min: number; max: number }
  | { key: "numberMinError"; min: number }
  | { key: "numberMaxError"; max: number };

type PublicQuestion = Question["question"];

export function publicQuestionId(question: PublicQuestion) {
  return question.id ?? String(question.display_order);
}

export function publicQuestionLocale(
  question: PublicQuestion,
  locale: FormLocale,
): FormLocale {
  if (question.label[locale][0]?.label.trim()) return locale;
  return locale === "th" ? "en" : "th";
}

export function publicAnswerIssue(
  question: PublicQuestion,
  answer: PublicFormAnswer | undefined,
  locale: FormLocale,
): PublicFormAnswerIssue | null {
  const text = typeof answer === "string" ? answer.trim() : "";
  const answered =
    text.length > 0 ||
    (Array.isArray(answer) && answer.length > 0) ||
    typeof answer === "number";
  if (!answered) return question.is_required ? { key: "requiredError" } : null;

  const invalid = { key: "invalidAnswer" } as const;
  switch (question.type) {
    case "short_text":
    case "long_text": {
      const maxLength =
        question.max_length || (question.type === "short_text" ? 255 : 5000);
      return typeof answer === "string" &&
        text.length >= question.min_length &&
        text.length <= maxLength
        ? null
        : invalid;
    }
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)
        ? null
        : { key: "emailError" };
    case "number": {
      const value = typeof answer === "number" ? answer : Number(text);
      if ((!text && typeof answer !== "number") || !Number.isFinite(value)) {
        return { key: "numberInvalidError" };
      }
      const min = question.min_value;
      const max = question.max_value;
      if (min != null && max != null && (value < min || value > max)) {
        return { key: "numberRangeError", min, max };
      }
      if (min != null && value < min) return { key: "numberMinError", min };
      if (max != null && value > max) return { key: "numberMaxError", max };
      return null;
    }
    case "multiple_choice":
    case "dropdown":
    case "checkbox": {
      const language = publicQuestionLocale(question, locale);
      const choices = question.label[language][0]?.choices[language] ?? [];
      const values = Array.isArray(answer) ? answer : [text];
      if (Array.isArray(answer) !== (question.type === "checkbox"))
        return invalid;
      return values.every((value) =>
        choices.some((choice) => choice.id === value),
      )
        ? null
        : invalid;
    }
    case "date":
      return fromBangkokInput(text.replace(" ", "T")) ? null : invalid;
    case "time":
      return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(text) ? null : invalid;
    case "rating": {
      const isScale = question.rating_display === "linear_scale";
      const min = isScale && question.min_number === 0 ? 0 : 1;
      const max =
        (isScale
          ? question.max_number || question.rating_max
          : question.rating_max || question.max_number) || 5;
      return typeof answer === "number" &&
        Number.isInteger(answer) &&
        answer >= min &&
        answer <= max
        ? null
        : invalid;
    }
  }
}
