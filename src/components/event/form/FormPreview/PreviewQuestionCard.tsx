"use client";

import { useTranslations } from "next-intl";
import { AlertIcon } from "@/icons";
import { Question } from "@/types/event/form";
import PreviewShortText from "./fields/PreviewShortText";
import PreviewLongText from "./fields/PreviewLongText";
import PreviewEmail from "./fields/PreviewEmail";
import PreviewNumber from "./fields/PreviewNumber";
import PreviewMultipleChoice from "./fields/PreviewMultipleChoice";
import PreviewCheckbox from "./fields/PreviewCheckbox";
import PreviewDropdown from "./fields/PreviewDropdown";
import PreviewDate from "./fields/PreviewDate";
import PreviewTime from "./fields/PreviewTime";
import PreviewRating from "./fields/PreviewRating";

export type AnswerValue = string | string[] | number;

interface PreviewQuestionCardProps {
  question: Question["question"];
  answer?: AnswerValue;
  errorMessage?: string;
  onChangeAnswer: (value: AnswerValue) => void;
  onToggleCheckbox: (choiceId: string) => void;
  onClearAnswer: () => void;
}

export default function PreviewQuestionCard({
  question,
  answer,
  errorMessage,
  onChangeAnswer,
  onToggleCheckbox,
  onClearAnswer,
}: PreviewQuestionCardProps) {
  const tPreview = useTranslations("form.preview");

  const qId = question.id!;
  const labelObj = question.label.en[0];
  const questionTitle = labelObj.label.trim() || tPreview("untitledQuestion");
  const choices = labelObj.choices.en;
  const hasError = !!errorMessage;

  return (
    <div
      id={`preview-q-${qId}`}
      className={`rounded-xl border bg-white p-5 shadow-sm transition-all sm:p-6 ${
        hasError ? "border-red-500" : "border-gray-200"
      }`}
    >
      {/* Question Title */}
      <div className="mb-4 text-base font-medium text-gray-900">
        <span>{questionTitle}</span>
        {question.required && <span className="ms-1 text-red-600">*</span>}
      </div>

      {/* Answer Input by Question Type */}
      {question.type === "short_text" && (
        <PreviewShortText
          value={(answer as string) || ""}
          onChange={(val) => onChangeAnswer(val)}
        />
      )}

      {question.type === "long_text" && (
        <PreviewLongText
          value={(answer as string) || ""}
          onChange={(val) => onChangeAnswer(val)}
        />
      )}

      {question.type === "email" && (
        <PreviewEmail
          value={(answer as string) || ""}
          onChange={(val) => onChangeAnswer(val)}
        />
      )}

      {question.type === "number" && (
        <PreviewNumber
          value={answer !== undefined ? String(answer) : ""}
          min={question.min_value}
          max={question.max_value}
          onChange={(val) => onChangeAnswer(val)}
        />
      )}

      {question.type === "multiple_choice" && (
        <PreviewMultipleChoice
          questionId={qId}
          choices={choices}
          required={question.required}
          value={answer as string | undefined}
          onChange={(choiceId) => onChangeAnswer(choiceId)}
          onClear={onClearAnswer}
        />
      )}

      {question.type === "checkbox" && (
        <PreviewCheckbox
          choices={choices}
          selectedValues={(answer as string[]) || []}
          onToggleChoice={onToggleCheckbox}
        />
      )}

      {question.type === "dropdown" && (
        <PreviewDropdown
          choices={choices}
          value={(answer as string) || ""}
          onChange={(val) => onChangeAnswer(val)}
        />
      )}

      {question.type === "date" && (
        <PreviewDate
          value={(answer as string) || ""}
          onChange={(val) => onChangeAnswer(val)}
        />
      )}

      {question.type === "time" && (
        <PreviewTime
          value={(answer as string) || ""}
          onChange={(val) => onChangeAnswer(val)}
        />
      )}

      {question.type === "rating" && (
        <PreviewRating
          minNumber={question.min_number}
          maxNumber={question.max_number || 5}
          ratingMode={question.rating_type || "rating"}
          minLabel={question.min_label}
          maxLabel={question.max_label}
          required={question.required}
          value={answer as number | undefined}
          onChange={(level) => onChangeAnswer(level)}
          onClear={onClearAnswer}
        />
      )}

      {/* Validation Error Message */}
      {hasError && (
        <div className="mt-4 flex items-center gap-2 text-xs font-medium text-red-600">
          <AlertIcon className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
