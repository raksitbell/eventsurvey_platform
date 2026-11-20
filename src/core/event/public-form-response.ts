import { fromBangkokInput } from "@/core/i18n/bangkok-datetime";
import type { Choice, Form, FormLocale, Question } from "@/types/event/form";
import type { MockSubmissionAnswer } from "@/types/mock";

export type PublicFormAnswer = string | string[] | number;
type PreparedAnswer = Omit<MockSubmissionAnswer, "id" | "submission_id" | "created_at"> & { optionIds: string[] };
type PreparedSubmission =
  | { ok: true; answers: PreparedAnswer[] }
  | { ok: false; fieldId?: string; issue: PublicFormAnswerIssue };
export type PublicFormAnswerIssue =
  | {
      key:
        "requiredError" | "emailError" | "numberInvalidError" | "invalidAnswer";
    }
  | { key: "numberRangeError"; min: number; max: number }
  | { key: "numberMinError"; min: number }
  | { key: "numberMaxError"; max: number };

type PublicQuestion = Question["question"];

/** Older form snapshots can contain ordered choices without a stored ID. */
export function answerChoicesWithIds(choices: Choice[]): (Choice & { id: string })[] {
  const ids = new Set(choices.map((choice) => choice.id).filter(Boolean));
  return choices.map((choice) => {
    if (choice.id) return { ...choice, id: choice.id };
    let id = `legacy-choice-${choice.display_order}`;
    while (ids.has(id)) id = "_" + id;
    ids.add(id);
    return { ...choice, id };
  });
}

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
      return text.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)
        ? null
        : { key: "emailError" };
    case "number": {
      const value = typeof answer === "number" ? answer : Number(text);
      if ((typeof answer !== "number" && !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text)) || !Number.isFinite(value)) {
        return { key: "numberInvalidError" };
      }
      const min = question.min_value === undefined ? question.min_number || null : question.min_value;
      const max = question.max_value === undefined ? question.max_number || null : question.max_value;
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
      const choices = answerChoicesWithIds(question.label[language][0]?.choices[language] ?? []);
      const values = Array.isArray(answer) ? answer : [text];
      if (Array.isArray(answer) !== (question.type === "checkbox") || new Set(values).size !== values.length)
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

/** Bind submitted values to the authoritative form before any answer rows are written. */
export function preparePublicFormAnswers(form: Form, submitted: unknown, locale: FormLocale): PreparedSubmission {
  const invalid = { key: "invalidAnswer" } as const;
  if (!submitted || typeof submitted !== "object" || Array.isArray(submitted) || (locale !== "th" && locale !== "en")) {
    return { ok: false, issue: invalid };
  }
  const values = submitted as Record<string, unknown>;
  const ids = new Set(form.questions.map(({ question }) => publicQuestionId(question)));
  if (ids.size !== form.questions.length || Object.keys(values).some((id) => !ids.has(id))) {
    return { ok: false, issue: invalid };
  }
  const answers: PreparedAnswer[] = [];
  for (const { question } of form.questions) {
    const fieldId = publicQuestionId(question);
    const answer = Object.hasOwn(values, fieldId) ? values[fieldId] : undefined;
    if (answer !== undefined && typeof answer !== "string" && typeof answer !== "number" &&
      !(question.type === "checkbox" && Array.isArray(answer) && answer.every((id) => typeof id === "string"))) {
      return { ok: false, fieldId, issue: invalid };
    }
    const issue = publicAnswerIssue(question, answer, locale);
    if (issue) return { ok: false, fieldId, issue };
    if (answer === undefined || (typeof answer === "string" && !answer.trim()) || (Array.isArray(answer) && !answer.length)) continue;
    const row: PreparedAnswer = {
      field_id: fieldId, value_text: null, value_number: null, value_boolean: null,
      value_date: null, value_time: null, optionIds: [],
    };
    const text = typeof answer === "string" ? answer.trim() : "";
    switch (question.type) {
      case "number":
      case "rating":
        row.value_number = Number(answer);
        break;
      case "date":
        [row.value_date, row.value_time] = text.split(/[T ]/);
        break;
      case "time":
        row.value_time = text;
        break;
      case "checkbox":
      case "dropdown":
      case "multiple_choice":
        row.optionIds = Array.isArray(answer) ? answer : [text];
        break;
      default:
        row.value_text = text;
    }
    answers.push(row);
  }
  return { ok: true, answers };
}
