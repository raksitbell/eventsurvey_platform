import { useState } from "react";
import { CloseLineIcon, MoreDotIcon } from "@/icons";
import { QuestionFieldProps } from "@/types/event/form";

export default function Dropdown({
  choices,
  onAddChoice,
  onUpdateChoice,
  onDeleteChoice,
  onReorderChoice,
}: QuestionFieldProps) {
  const [draggedChoiceId, setDraggedChoiceId] = useState<string | null>(null);
  const [dragOverChoiceId, setDragOverChoiceId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {choices.map((choice, index) => {
        const isDragging = draggedChoiceId === choice.id;
        const isDragOver =
          dragOverChoiceId === choice.id && draggedChoiceId !== choice.id;

        return (
          <div
            key={choice.id}
            draggable
            onDragStart={(e) => {
              e.stopPropagation();
              setDraggedChoiceId(choice.id!);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (draggedChoiceId && draggedChoiceId !== choice.id) {
                setDragOverChoiceId(choice.id!);
              }
            }}
            onDragLeave={(e) => {
              e.stopPropagation();
              if (dragOverChoiceId === choice.id) {
                setDragOverChoiceId(null);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (draggedChoiceId && draggedChoiceId !== choice.id) {
                onReorderChoice(draggedChoiceId, choice.id!);
              }
              setDraggedChoiceId(null);
              setDragOverChoiceId(null);
            }}
            onDragEnd={(e) => {
              e.stopPropagation();
              setDraggedChoiceId(null);
              setDragOverChoiceId(null);
            }}
            className={`group flex items-center gap-2 rounded-md px-1 py-1 transition-all ${
              isDragging ? "opacity-40" : ""
            } ${
              isDragOver ? "border-t-2 border-[#5C54D1] bg-indigo-50/40" : ""
            }`}
          >
            {/* Drag Handle for Choice */}
            <span
              className="shrink-0 cursor-grab text-gray-300 transition-colors group-hover:text-gray-500 active:cursor-grabbing"
              title="Drag to reorder option"
            >
              <MoreDotIcon className="h-5 w-5" />
            </span>

            <span className="w-5 shrink-0 text-sm text-gray-500">
              {index + 1}.
            </span>
            <input
              type="text"
              value={choice.label}
              onChange={(e) => onUpdateChoice(choice.id!, e.target.value)}
              placeholder={`Option ${choice.display_order}`}
              className="min-w-0 flex-1 border-b border-transparent bg-transparent py-1 text-sm text-gray-800 transition-all hover:border-gray-200 focus:border-b-2 focus:border-[#5C54D1] focus:outline-none"
            />
            {choices.length > 1 && (
              <button
                type="button"
                onClick={() => onDeleteChoice(choice.id!)}
                className="shrink-0 rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                aria-label="Remove option"
              >
                <CloseLineIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      })}

      {/* Add option row */}
      <div className="flex items-center gap-2 px-1">
        <span className="h-5 w-5 shrink-0" />
        <span className="w-5 shrink-0 text-sm text-gray-400">
          {choices.length + 1}.
        </span>
        <button
          type="button"
          onClick={onAddChoice}
          className="border-b border-transparent py-1 text-sm text-gray-500 transition-all hover:border-gray-300 hover:text-gray-800"
        >
          Add option
        </button>
      </div>
    </div>
  );
}
