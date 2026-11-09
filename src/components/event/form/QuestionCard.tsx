"use client";

import type { ComponentType } from "react";
import { useTranslations } from "next-intl";
import {
  DocumentDuplicateIcon,
  EllipsisHorizontalIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { ThFlagIcon, UsFlagIcon } from "@/icons";
import {
  FormLocale,
  ICON,
  Question,
  QuestionFieldProps,
  QUESTIONS_TYPES,
  QuestionType,
  RATING_DISPLAY,
  UNIQUE_QUESTION_TYPES,
} from "@/types/event/form";
import ShortText from "./chioce/ShortText";
import LongText from "./chioce/LongText";
import Email from "./chioce/Email";
import NumberField from "./chioce/Number";
import MutipleChoice from "./chioce/MutipleChoice";
import Dropdown from "./chioce/Dropdown";
import Checkbox from "./chioce/Checkbox";
import DateField from "./chioce/Date";
import TimeField from "./chioce/Time";
import Rating from "./chioce/Rating";

const QuestionTypeComp: Partial<
  Record<QuestionType, ComponentType<QuestionFieldProps>>
> = {
  short_text: ShortText,
  long_text: LongText,
  email: Email,
  number: NumberField,
  multiple_choice: MutipleChoice,
  dropdown: Dropdown,
  checkbox: Checkbox,
  date: DateField,
  time: TimeField,
  rating: Rating,
};

interface QuestionCardProps {
  question: Question["question"];
  locale?: FormLocale;
  showLocaleBadge?: boolean;
  isActive: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  draggedChoiceId?: string | null;
  dragOverChoiceId?: string | null;
  sectionRef?: (el: HTMLDivElement | null) => void;
  onSelect: () => void;
  onDragStart?: () => void;
  onDragOver?: () => void;
  onDragLeave?: () => void;
  onDrop?: () => void;
  onDragEnd?: () => void;
  onChoiceDragStart?: (choiceId: string) => void;
  onChoiceDragOver?: (choiceId: string) => void;
  onChoiceDragLeave?: (choiceId: string) => void;
  onChoiceDragEnd?: () => void;
  onChangeLabel: (label: string) => void;
  onChangeType: (type: QuestionType) => void;
  onToggleRequired: () => void;
  onToggleUnique: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onAddChoice: () => void;
  onUpdateChoice: (choiceId: string, label: string) => void;
  onDeleteChoice: (choiceId: string) => void;
  onReorderChoice: (sourceChoiceId: string, targetChoiceId: string) => void;
  onUpdateRange: (min: number, max: number) => void;
  onUpdateNumberBounds: (min: number | null, max: number | null) => void;
  onUpdateRatingDisplay: (display: RATING_DISPLAY) => void;
  onUpdateRatingIcon: (icon: ICON) => void;
  onUpdateLinearLabels: (minLabel: string, maxLabel: string) => void;
}

export default function QuestionCard({
  question,
  locale = "th",
  showLocaleBadge = false,
  isActive,
  isDragging,
  isDragOver,
  draggedChoiceId,
  dragOverChoiceId,
  sectionRef,
  onSelect,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onChoiceDragStart,
  onChoiceDragOver,
  onChoiceDragLeave,
  onChoiceDragEnd,
  onChangeLabel,
  onChangeType,
  onToggleRequired,
  onToggleUnique,
  onDuplicate,
  onDelete,
  onAddChoice,
  onUpdateChoice,
  onDeleteChoice,
  onReorderChoice,
  onUpdateRange,
  onUpdateNumberBounds,
  onUpdateRatingDisplay,
  onUpdateRatingIcon,
  onUpdateLinearLabels,
}: QuestionCardProps) {
  const tbuilder = useTranslations("form.builder");
  const label = question.label[locale]?.[0] ?? question.label.th[0];
  const Field = QuestionTypeComp[question.type];
  const FlagIcon = locale === "th" ? ThFlagIcon : UsFlagIcon;
  const canBeUnique = (
    UNIQUE_QUESTION_TYPES as readonly QuestionType[]
  ).includes(question.type);
  const isStandaloneDraggable = Boolean(onDragStart);

  return (
    <div
      ref={sectionRef}
      onClick={onSelect}
      draggable={isStandaloneDraggable || undefined}
      onDragStart={
        isStandaloneDraggable
          ? (e) => {
              const target = e.target as HTMLElement;
              if (target.closest("input, textarea, select, button, label")) {
                e.preventDefault();
                return;
              }
              onDragStart?.();
              e.dataTransfer.effectAllowed = "move";
            }
          : undefined
      }
      onDragOver={
        isStandaloneDraggable
          ? (e) => {
              e.preventDefault();
              onDragOver?.();
            }
          : undefined
      }
      onDragLeave={isStandaloneDraggable ? onDragLeave : undefined}
      onDrop={
        isStandaloneDraggable
          ? (e) => {
              e.preventDefault();
              onDrop?.();
            }
          : undefined
      }
      onDragEnd={isStandaloneDraggable ? onDragEnd : undefined}
      className={`group flex h-full flex-col rounded-xl border bg-white px-4 pt-2 pb-4 shadow-theme-xs transition-all sm:px-6 sm:pb-6 dark:bg-gray-900 ${
        isActive
          ? "border-gray-300 border-s-4 border-s-brand-500 dark:border-gray-700 dark:border-s-brand-500"
          : "border-gray-200 dark:border-gray-800"
      } ${isDragging ? "opacity-40" : ""} ${
        isDragOver ? "border-t-4 border-t-brand-500" : ""
      }`}
    >
      {/* Top Drag Handle Bar */}
      <div
        className="relative mb-2 flex cursor-grab items-center justify-center py-1 text-gray-300 transition-colors group-hover:text-gray-400 active:cursor-grabbing dark:text-gray-600 dark:group-hover:text-gray-400"
        title="Drag to reorder question"
      >
        {showLocaleBadge && (
          <span className="absolute start-0 inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-theme-xs font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
            <FlagIcon className="size-3 rounded-sm" />
            <span>{locale.toUpperCase()}</span>
          </span>
        )}
        <EllipsisHorizontalIcon className="h-5 w-5" />
      </div>

      {/* Question Input & Type Selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder={tbuilder("questionPlaceholder")}
          className="min-w-0 flex-1 rounded-md bg-gray-50 p-3 text-sm text-gray-800 focus:border-b-2 focus:border-brand-500 focus:outline-none sm:text-base dark:bg-gray-800 dark:text-gray-100"
          value={label.label}
          onFocus={onSelect}
          onChange={(e) => onChangeLabel(e.target.value)}
        />
        <select
          className="w-full rounded-md bg-gray-50 p-3 text-sm text-gray-800 sm:w-48 sm:text-base dark:bg-gray-800 dark:text-gray-100"
          value={question.type}
          onFocus={onSelect}
          onChange={(e) => onChangeType(e.target.value as QuestionType)}
        >
          {QUESTIONS_TYPES.map((qType) => (
            <option key={qType} value={qType}>
              {tbuilder("choice." + qType)}
            </option>
          ))}
        </select>
      </div>

      {/* Answer / Choices Area */}
      <div className="mt-5 flex-1 sm:mt-6">
        {Field && (
          <Field
            question={question}
            locale={locale}
            choices={label.choices[locale]}
            draggedChoiceId={draggedChoiceId}
            dragOverChoiceId={dragOverChoiceId}
            onChoiceDragStart={onChoiceDragStart}
            onChoiceDragOver={onChoiceDragOver}
            onChoiceDragLeave={onChoiceDragLeave}
            onChoiceDragEnd={onChoiceDragEnd}
            onAddChoice={onAddChoice}
            onUpdateChoice={onUpdateChoice}
            onDeleteChoice={onDeleteChoice}
            onReorderChoice={onReorderChoice}
            onUpdateRange={onUpdateRange}
            onUpdateNumberBounds={onUpdateNumberBounds}
            onUpdateRatingDisplay={onUpdateRatingDisplay}
            onUpdateRatingIcon={onUpdateRatingIcon}
            onUpdateLinearLabels={onUpdateLinearLabels}
          />
        )}
      </div>

      {/* Card Footer (Duplicate, Delete, Unique & Required) */}
      <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 pt-3 sm:mt-6 sm:pt-4 dark:border-gray-800">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          title="Duplicate question"
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          aria-label="Duplicate question"
        >
          <DocumentDuplicateIcon className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete question"
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-error-50 hover:text-error-600 dark:text-gray-400 dark:hover:bg-error-500/15 dark:hover:text-error-400"
          aria-label="Delete question"
        >
          <TrashIcon className="h-5 w-5" />
        </button>

        {canBeUnique && (
          <label className="ms-2 flex cursor-pointer items-center gap-2 border-s border-gray-200 ps-3 text-sm text-gray-600 sm:ps-4 dark:border-gray-700 dark:text-gray-300">
            <span>{tbuilder("unique")}</span>
            <input
              type="checkbox"
              checked={question.is_unique}
              onChange={onToggleUnique}
              className="h-4 w-4 accent-brand-500"
            />
          </label>
        )}

        <label className="ms-2 flex cursor-pointer items-center gap-2 border-s border-gray-200 ps-3 text-sm text-gray-600 sm:ps-4 dark:border-gray-700 dark:text-gray-300">
          <span>{tbuilder("required")}</span>
          <input
            type="checkbox"
            checked={question.is_required}
            onChange={onToggleRequired}
            className="h-4 w-4 accent-brand-500"
          />
        </label>
      </div>
    </div>
  );
}
