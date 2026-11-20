import type { FormLocale, Question } from "@/types/event/form";

type QuestionRange = Pick<Question["question"],
  "type" | "min_length" | "max_length" | "min_number" | "max_number" | "min_value" | "max_value">;
type QuestionContent = QuestionRange & Pick<Question["question"], "label">;
type FormContent = {
  head: Record<FormLocale, { title: string }>;
  questions: readonly { question: QuestionContent }[];
};
const choiceTypes = new Set(["multiple_choice", "checkbox", "dropdown"]);

export function hasCompleteFormTranslation(form: FormContent, locale: FormLocale) {
  if (!form.head[locale].title.trim() || !form.questions.length) return false;
  return form.questions.every(({ question }) => {
    const label = question.label[locale][0];
    if (!label?.label.trim()) return false;
    if (!choiceTypes.has(question.type)) return true;
    const choices = label.choices[locale];
    const other = locale === "th" ? "en" : "th";
    const otherChoices = question.label[other][0]?.choices[other] ?? [];
    if (!choices.length || !choices.every((choice) => choice.label.trim())) return false;
    const orders = new Set(choices.map((choice) => choice.display_order));
    const ids = new Set(choices.map((choice) => choice.id));
    return otherChoices.every((choice) => choice.id
      ? ids.has(choice.id)
      : orders.has(choice.display_order));
  });
}

/** A single language supplies the title and every question and option in the form. */
export function completeFormLocale(form: FormContent, preferred: FormLocale): FormLocale | null {
  if (hasCompleteFormTranslation(form, preferred)) return preferred;
  const other = preferred === "th" ? "en" : "th";
  return hasCompleteFormTranslation(form, other) ? other : null;
}

export function invalidQuestionRange(question: QuestionRange) {
  if (question.max_length > 0 && question.min_length > question.max_length) return "min_length";
  if (question.type === "number") {
    // Builder's numeric min/max fields use null for an unbounded end and zero is a valid bound.
    const min = question.min_value === undefined ? question.min_number || null : question.min_value;
    const max = question.max_value === undefined ? question.max_number || null : question.max_value;
    if (min != null && max != null && min > max)
      return question.min_value !== undefined ? "min_value" : "min_number";
  }
  return question.type === "rating" && question.min_number > question.max_number ? "min_number" : null;
}

export function validatePublishReady(form: FormContent): string | null {
  if (!completeFormLocale(form, "th"))
    return "Form requires a title, questions and their choices in at least one language";
  if (form.questions.some(({ question }) => invalidQuestionRange(question)))
    return "Question ranges must have a minimum no greater than the maximum";
  return null;
}
