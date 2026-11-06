"use client";

import { useTranslations } from "next-intl";
import { Choice } from "@/types/event/form";

interface PreviewMultipleChoiceProps {
  questionId: string;
  choices: Choice[];
  required: boolean;
  value?: string;
  onChange: (choiceId: string) => void;
  onClear: () => void;
}

export default function PreviewMultipleChoice({
  questionId,
  choices,
  required,
  value,
  onChange,
  onClear,
}: PreviewMultipleChoiceProps) {
  const tPreview = useTranslations("form.preview");

  return (
    <div className="flex flex-col gap-3">
      {choices.map((choice) => {
        const cId = choice.id!;
        const isChecked = value === cId;

        return (
          <label
            key={cId}
            className="flex cursor-pointer items-center gap-3 text-sm text-gray-800"
          >
            <input
              type="radio"
              name={`q-${questionId}`}
              checked={isChecked}
              onChange={() => onChange(cId)}
              className="h-5 w-5 shrink-0 cursor-pointer accent-[#5C54D1]"
            />
            <span>{choice.label}</span>
          </label>
        );
      })}

      {!required && value && (
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClear}
            className="rounded px-2 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
          >
            {tPreview("clearSelection")}
          </button>
        </div>
      )}
    </div>
  );
}

