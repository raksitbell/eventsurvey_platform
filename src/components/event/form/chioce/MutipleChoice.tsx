import { useState } from "react";
import { useTranslations } from "next-intl";
import { EllipsisVerticalIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { QuestionFieldProps } from "@/types/event/form";

export default function MutipleChoice({
  choices,
  draggedChoiceId: sharedDraggedChoiceId,
  dragOverChoiceId: sharedDragOverChoiceId,
  onChoiceDragStart,
  onChoiceDragOver,
  onChoiceDragLeave,
  onChoiceDragEnd,
  onAddChoice,
  onUpdateChoice,
  onDeleteChoice,
  onReorderChoice,
}: QuestionFieldProps) {
  const tbuilder = useTranslations("form.builder");
  const [localDraggedId, setLocalDraggedId] = useState<string | null>(null);
  const [localDragOverId, setLocalDragOverId] = useState<string | null>(null);

  const draggedChoiceId =
    sharedDraggedChoiceId !== undefined ? sharedDraggedChoiceId : localDraggedId;
  const dragOverChoiceId =
    sharedDragOverChoiceId !== undefined
      ? sharedDragOverChoiceId
      : localDragOverId;

  return (
    <div className="flex flex-col gap-3">
      {choices.map((choice) => {
        const isDragging = draggedChoiceId === choice.id;
        const isDragOver =
          dragOverChoiceId === choice.id && draggedChoiceId !== choice.id;

        return (
          <div
            key={choice.id}
            draggable
            onDragStart={(e) => {
              const target = e.target as HTMLElement;
              if (target.closest("input, button")) {
                e.preventDefault();
                e.stopPropagation();
                return;
              }
              e.stopPropagation();
              if (onChoiceDragStart) {
                onChoiceDragStart(choice.id!);
              } else {
                setLocalDraggedId(choice.id!);
              }
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (draggedChoiceId && draggedChoiceId !== choice.id) {
                if (onChoiceDragOver) {
                  onChoiceDragOver(choice.id!);
                } else {
                  setLocalDragOverId(choice.id!);
                }
              }
            }}
            onDragLeave={(e) => {
              e.stopPropagation();
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                if (onChoiceDragLeave) {
                  onChoiceDragLeave(choice.id!);
                } else if (localDragOverId === choice.id) {
                  setLocalDragOverId(null);
                }
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (draggedChoiceId && draggedChoiceId !== choice.id) {
                onReorderChoice(draggedChoiceId, choice.id!);
              }
              if (onChoiceDragEnd) {
                onChoiceDragEnd();
              } else {
                setLocalDraggedId(null);
                setLocalDragOverId(null);
              }
            }}
            onDragEnd={(e) => {
              e.stopPropagation();
              if (onChoiceDragEnd) {
                onChoiceDragEnd();
              } else {
                setLocalDraggedId(null);
                setLocalDragOverId(null);
              }
            }}
            className={`group flex items-center gap-2 rounded-md px-1 py-1 transition-all ${
              isDragging ? "opacity-40" : ""
            } ${
              isDragOver
                ? "border-t-2 border-brand-500 bg-brand-50/40 dark:bg-brand-500/10"
                : ""
            }`}
          >
            {/* Drag Handle for Choice */}
            <span
              className="shrink-0 cursor-grab text-gray-300 transition-colors group-hover:text-gray-500 active:cursor-grabbing dark:text-gray-600 dark:group-hover:text-gray-400"
              title="Drag to reorder option"
            >
              <EllipsisVerticalIcon className="h-5 w-5" />
            </span>

            <input
              type="radio"
              disabled
              className="h-5 w-5 shrink-0 cursor-default accent-brand-500"
            />
            <input
              type="text"
              value={choice.label}
              onChange={(e) => onUpdateChoice(choice.id!, e.target.value)}
              placeholder={`Option ${choice.display_order}`}
              className="min-w-0 flex-1 border-b border-transparent bg-transparent py-1 text-sm text-gray-800 transition-all hover:border-gray-200 focus:border-b-2 focus:border-brand-500 focus:outline-none dark:text-gray-100 dark:hover:border-gray-700"
            />
            {choices.length > 1 && (
              <button
                type="button"
                onClick={() => onDeleteChoice(choice.id!)}
                className="shrink-0 rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                aria-label="Remove option"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      })}

      {/* Add option row */}
      <div className="flex items-center gap-2 px-1">
        <span className="h-5 w-5 shrink-0" />
        <input
          type="radio"
          disabled
          className="h-5 w-5 shrink-0 cursor-default opacity-50"
        />
        <button
          type="button"
          onClick={onAddChoice}
          className="border-b border-transparent py-1 text-sm text-gray-500 transition-all hover:border-gray-300 hover:text-gray-800 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-200"
        >
          {tbuilder("addOption")}
        </button>
      </div>
    </div>
  );
}
