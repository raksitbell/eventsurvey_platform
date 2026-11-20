"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  HandThumbUpIcon,
  HeartIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import { ICON, RATING_DISPLAY } from "@/types/event/form";

interface PreviewRatingProps {
  appearance?: "card" | "participant";
  minNumber?: number;
  maxNumber: number;
  ratingDisplay?: RATING_DISPLAY;
  ratingIcon?: ICON;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  required: boolean;
  value?: number;
  onChange: (level: number) => void;
  onClear: () => void;
}

function PreviewIconGlyph({
  icon,
  isHighlighted,
}: {
  icon: ICON;
  isHighlighted: boolean;
}) {
  if (icon === "heart") {
    return (
      <HeartIcon
        className={`h-6 w-6 transition-colors sm:h-7 sm:w-7 ${
          isHighlighted
            ? "fill-rose-500 text-rose-500"
            : "text-gray-300 group-hover:text-rose-300"
        }`}
      />
    );
  }

  if (icon === "like") {
    return (
      <HandThumbUpIcon
        className={`h-6 w-6 transition-colors sm:h-7 sm:w-7 ${
          isHighlighted
            ? "fill-[var(--participant-control-text,#5C54D1)] text-[color:var(--participant-control-text,#5C54D1)]"
            : "text-gray-300 group-hover:text-indigo-300"
        }`}
      />
    );
  }

  return (
    <StarIcon
      className={`h-6 w-6 transition-colors sm:h-7 sm:w-7 ${
        isHighlighted
          ? "fill-amber-400 text-amber-400"
          : "text-gray-300 group-hover:text-amber-300"
      }`}
    />
  );
}

export default function PreviewRating({
  appearance = "card",
  minNumber = 1,
  maxNumber,
  ratingDisplay = "icon",
  ratingIcon = "star",
  scaleMinLabel,
  scaleMaxLabel,
  required,
  value,
  onChange,
  onClear,
}: PreviewRatingProps) {
  const tPreview = useTranslations("form.preview");
  const [hoveredLevel, setHoveredLevel] = useState<number | null>(null);

  const start =
    ratingDisplay === "linear_scale" && (minNumber === 0 || minNumber === 1)
      ? minNumber
      : 1;
  const end = maxNumber || 5;
  const levels = Array.from(
    { length: Math.max(1, end - start + 1) },
    (_, idx) => start + idx,
  );

  const hasSelection = value !== undefined && value !== null;
  const activeRating = hoveredLevel ?? (value ?? -1);
  const participant = appearance === "participant";
  const participantScale = "grid min-w-0 flex-1 grid-cols-[repeat(auto-fit,minmax(min(100%,2.75rem),1fr))] gap-2";

  if (ratingDisplay === "linear_scale") {
    return (
      <div className="flex flex-col gap-3">
        <div className={participant
          ? "flex min-w-0 flex-col gap-2 pt-2 @xl/question:flex-row @xl/question:items-center"
          : "flex flex-col gap-3 pt-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4"}>
          {scaleMinLabel?.trim() ? (
            <span className={participant ? "text-sm text-gray-800 @xl/question:max-w-1/5" : "text-sm text-gray-800 sm:pb-2.5"}>
              {scaleMinLabel.trim()}
            </span>
          ) : !participant && (
            <span className="hidden sm:block" />
          )}

          <div className={participant ? participantScale : "flex flex-1 flex-wrap items-center justify-around gap-3 sm:gap-4"}>
            {levels.map((level) => {
              const isSelected = hasSelection && value === level;

              return (
                <button
                  key={level}
                  type="button"
                  onMouseEnter={() => setHoveredLevel(level)}
                  onMouseLeave={() => setHoveredLevel(null)}
                  onClick={() => onChange(level)}
                  aria-pressed={isSelected}
                  className={appearance === "participant"
                    ? "flex min-h-11 min-w-10 flex-1 items-center justify-center rounded-lg border border-preview-border bg-white p-2 aria-pressed:border-(--participant-accent) aria-pressed:bg-(--participant-accent) aria-pressed:text-(--participant-on-accent)"
                    : "group flex flex-col items-center gap-3 rounded-lg p-2"}
                >
                  <span className={appearance === "participant" ? "text-sm font-semibold" : "text-sm text-gray-800"}>{level}</span>

                  {appearance === "card" && <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors sm:h-6 sm:w-6 ${
                      isSelected
                        ? "border-[var(--participant-control-text,#5C54D1)]"
                        : hoveredLevel === level
                          ? "border-[var(--participant-control-text,#5C54D1)]"
                          : "border-gray-500 group-hover:border-[var(--participant-control-text,#5C54D1)]"
                    }`}
                  >
                    {isSelected && (
                      <span className="h-2.5 w-2.5 rounded-full bg-[var(--participant-control-text,#5C54D1)] sm:h-3 sm:w-3" />
                    )}
                  </span>}
                </button>
              );
            })}
          </div>

          {scaleMaxLabel?.trim() ? (
            <span className={participant ? "text-end text-sm text-gray-800 @xl/question:max-w-1/5" : "text-end text-sm text-gray-800 sm:pb-2.5"}>
              {scaleMaxLabel.trim()}
            </span>
          ) : !participant && (
            <span className="hidden sm:block" />
          )}
        </div>

        {!required && hasSelection && (
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

  return (
    <div className="flex flex-col gap-3">
      <div className={participant ? `${participantScale} pt-2` : "grid grid-cols-5 gap-3 pt-2 sm:flex sm:flex-wrap sm:items-center sm:justify-around sm:gap-4"}>
        {levels.map((level) => {
          const isHighlighted = level <= activeRating;
          const isSelected = hasSelection && value === level;

          return (
            <button
              key={level}
              type="button"
              onMouseEnter={() => setHoveredLevel(level)}
              onMouseLeave={() => setHoveredLevel(null)}
              onClick={() => onChange(level)}
              aria-pressed={isSelected}
              className="group flex flex-col items-center gap-2 rounded-lg p-2 transition-transform hover:scale-110"
            >
              <span
                className={`text-xs font-medium ${
                  isSelected ? "font-bold text-[color:var(--participant-control-text,#5C54D1)]" : "text-gray-600"
                }`}
              >
                {level}
              </span>

              <PreviewIconGlyph
                icon={ratingIcon}
                isHighlighted={isHighlighted}
              />
            </button>
          );
        })}
      </div>

      {!required && hasSelection && (
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
