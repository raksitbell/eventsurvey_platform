"use client";

import { useTranslations } from "next-intl";
import { ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { FormLocale, Question } from "@/types/event/form";
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
  locale?: FormLocale;
  answer?: AnswerValue;
  errorMessage?: string;
  mockUniqueSample?: string;
  onChangeAnswer: (value: AnswerValue) => void;
  onToggleCheckbox: (choiceId: string) => void;
  onClearAnswer: () => void;
}

export default function PreviewQuestionCard({
  question,
  locale = "th",
  answer,
  errorMessage,
  mockUniqueSample,
  onChangeAnswer,
  onToggleCheckbox,
  onClearAnswer,
}: PreviewQuestionCardProps) {
  const tPreview = useTranslations("form.preview");

  const qId = question.id!;
  const labelObj = question.label[locale]?.[0] ?? question.label.th[0];
  const questionTitle = labelObj.label.trim() || tPreview("untitledQuestion");
  const choices = labelObj.choices[locale];
  const scaleMinLabel =
    labelObj.scale_min_label ?? choices[0]?.scale_min_label ?? "";
  const scaleMaxLabel =
    labelObj.scale_max_label ?? choices[0]?.scale_max_label ?? "";
  const hasError = !!errorMessage;

  const ratingMax =
    question.rating_display === "linear_scale"
      ? question.max_number || question.rating_max || 5
      : question.rating_max || question.max_number || 5;

  return (
    <div
      id={`preview-q-${qId}`}
      className={`rounded-xl border bg-white p-5 shadow-sm transition-all sm:p-6 ${
        hasError ? "border-red-500" : "border-gray-200"
      }`}
    >
      {/* Question Title */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="text-base font-medium text-gray-900">
          <span>{questionTitle}</span>
          {question.is_required && <span className="ms-1 text-red-600">*</span>}
        </div>

        {question.is_unique && (
          <span className="rounded-full bg-[#5C54D1]/10 px-2.5 py-0.5 text-xs font-medium text-[#5C54D1]">
            {tPreview("uniqueBadge")}
          </span>
        )}
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
          required={question.is_required}
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
          maxNumber={ratingMax}
          ratingDisplay={question.rating_display || "icon"}
          ratingIcon={question.rating_icon || "star"}
          scaleMinLabel={scaleMinLabel}
          scaleMaxLabel={scaleMaxLabel}
          required={question.is_required}
          value={answer as number | undefined}
          onChange={(level) => onChangeAnswer(level)}
          onClear={onClearAnswer}
        />
      )}

      {/* Mock Unique Value Hint for Testing */}
      {question.is_unique && mockUniqueSample && (
        <div className="mt-2.5 text-xs text-gray-500">
          {tPreview("uniqueMockHint", { value: mockUniqueSample })}
        </div>
      )}

      {/* Validation Error Message */}
      {hasError && (
        <div className="mt-4 flex items-center gap-2 text-xs font-medium text-red-600">
          <ExclamationCircleIcon className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
