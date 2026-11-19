import {
  UNIQUE_QUESTION_TYPES,
  type Question,
  type QuestionType,
} from "@/types/event/form";

const supportedTypes: ReadonlySet<QuestionType> = new Set(UNIQUE_QUESTION_TYPES);

export function supportsUniqueField(type: QuestionType): type is (typeof UNIQUE_QUESTION_TYPES)[number] {
  return supportedTypes.has(type);
}

export function canToggleUniqueField(
  question: Pick<Question["question"], "type" | "is_unique">,
  formHasUniqueField: boolean,
) {
  // Existing selections, including legacy duplicates, can always be cleared.
  return question.is_unique || (!formHasUniqueField && supportsUniqueField(question.type));
}

export function uniqueFieldIssue(questions: Question[]) {
  const fields = questions.filter(({ question }) => question.is_unique);
  if (fields.length > 1) return "FORM_UNIQUE_FIELD_LIMIT";
  if (fields.length && !supportsUniqueField(fields[0].question.type)) {
    return "FORM_UNIQUE_FIELD_TYPE";
  }
  return null;
}
