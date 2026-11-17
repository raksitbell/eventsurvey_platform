"use client";

import { useTranslations } from "next-intl";
import { Choice } from "@/types/event/form";

interface PreviewCheckboxProps {
  choices: Choice[];
  selectedValues: string[];
  onToggleChoice: (choiceId: string) => void;
}

export default function PreviewCheckbox({
  choices,
  selectedValues,
  onToggleChoice,
}: PreviewCheckboxProps) {
  const tBuilder = useTranslations("form.builder");

  return (
    <div className="flex flex-col gap-3">
      {choices.map((choice) => {
        const cId = choice.id!;
        const isChecked = selectedValues.includes(cId);

        return (
          <label
            key={cId}
            className="flex cursor-pointer items-center gap-3 text-sm text-gray-800 dark:text-gray-200"
          >
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => onToggleChoice(cId)}
              className="h-5 w-5 shrink-0 cursor-pointer rounded accent-brand-500"
            />
            <span>
              {choice.label.trim() ||
                tBuilder("optionPlaceholder", { order: choice.display_order })}
            </span>
          </label>
        );
      })}
    </div>
  );
}

