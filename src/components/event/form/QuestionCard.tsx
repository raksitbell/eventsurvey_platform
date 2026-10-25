"use client";

import type { ComponentType } from "react";
import { useTranslations } from "next-intl";
import { CopyIcon, HorizontaLDots, TrashBinIcon } from "@/icons";
import {
  Question,
  QuestionFieldProps,
  QUESTIONS_TYPES,
  QuestionType,
} from "@/types/event/form";
import ShortText from "./chioce/ShortText";
import LongText from "./chioce/LongText";
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
  multiple_choice: MutipleChoice,
  dropdown: Dropdown,
  checkbox: Checkbox,
  date: DateField,
  time: TimeField,
  rating: Rating,
};

interface QuestionCardProps {
  question: Question["question"];
  isActive: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  sectionRef: (el: HTMLDivElement | null) => void;
  onSelect: () => void;
  onDragStart: () => void;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
  onChangeLabel: (label: string) => void;
  onChangeType: (type: QuestionType) => void;
  onToggleRequired: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onAddChoice: () => void;
  onUpdateChoice: (choiceId: string, label: string) => void;
  onDeleteChoice: (choiceId: string) => void;
  onReorderChoice: (sourceChoiceId: string, targetChoiceId: string) => void;
  onUpdateRange: (min: number, max: number) => void;
}

export default function QuestionCard({
  question,
  isActive,
  isDragging,
  isDragOver,
  sectionRef,
  onSelect,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onChangeLabel,
  onChangeType,
  onToggleRequired,
  onDuplicate,
  onDelete,
  onAddChoice,
  onUpdateChoice,
  onDeleteChoice,
  onReorderChoice,
  onUpdateRange,
}: QuestionCardProps) {
  const tbuilder = useTranslations("form.builder");
  const label = question.label.en[0];
  const Field = QuestionTypeComp[question.type];

  return (
    <div
      ref={sectionRef}
      onClick={onSelect}
      draggable
      onDragStart={(e) => {
        const target = e.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT"
        ) {
          e.preventDefault();
          return;
        }
        onDragStart();
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver();
      }}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      onDragEnd={onDragEnd}
      className={`group rounded-xl border bg-white px-6 pt-2 pb-6 shadow-sm transition-all ${
        isActive
          ? "border-gray-300 border-s-4 border-s-[#5C54D1]"
          : "border-gray-200"
      } ${isDragging ? "opacity-40" : ""} ${
        isDragOver ? "border-t-4 border-t-[#5C54D1]" : ""
      }`}
    >
      {/* Top Drag Handle Bar */}
      <div
        className="mb-2 flex cursor-grab justify-center py-1 text-gray-300 transition-colors group-hover:text-gray-400 active:cursor-grabbing"
        title="Drag to reorder question"
      >
        <HorizontaLDots className="h-5 w-5" />
      </div>

      {/* Question Input & Type Selector */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Question"
          className="min-w-0 flex-1 rounded-md bg-gray-50 p-3 focus:border-b-2 focus:border-[#5C54D1] focus:outline-none"
          value={label.label}
          onFocus={onSelect}
          onChange={(e) => onChangeLabel(e.target.value)}
        />
        <select
          className="w-48 rounded-md bg-gray-50 p-3"
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
      <div className="mt-6">
        {Field && (
          <Field
            question={question}
            choices={label.choices.en}
            onAddChoice={onAddChoice}
            onUpdateChoice={onUpdateChoice}
            onDeleteChoice={onDeleteChoice}
            onReorderChoice={onReorderChoice}
            onUpdateRange={onUpdateRange}
          />
        )}
      </div>

      {/* Card Footer (Duplicate, Delete & Required) */}
      <div className="mt-6 flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          title="Duplicate question"
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
          aria-label="Duplicate question"
        >
          <CopyIcon className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete question"
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
          aria-label="Delete question"
        >
          <TrashBinIcon className="h-5 w-5" />
        </button>

        <label className="ms-2 flex cursor-pointer items-center gap-2 border-s border-gray-200 ps-4 text-sm text-gray-600">
          <span>Required</span>
          <input
            type="checkbox"
            checked={question.required}
            onChange={onToggleRequired}
            className="h-4 w-4 accent-[#5C54D1]"
          />
        </label>
      </div>
    </div>
  );
}

