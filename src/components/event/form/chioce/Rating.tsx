"use client";

import { useTranslations } from "next-intl";
import { ShootingStarIcon } from "@/icons";
import { QuestionFieldProps, RatingMode } from "@/types/event/form";

export default function Rating({
  question,
  onUpdateRange,
  onUpdateRatingType,
  onUpdateLinearLabels,
}: QuestionFieldProps) {
  const tbuilder = useTranslations("form.builder");

  const min =
    question.min_number === 0 || question.min_number === 1
      ? question.min_number
      : 1;
  const max = question.max_number || 5;
  const ratingMode: RatingMode = question.rating_type || "rating";
  const minLabel = question.min_label ?? "";
  const maxLabel = question.max_label ?? "";

  const levels = Array.from(
    { length: Math.max(1, max - min + 1) },
    (_, idx) => min + idx,
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Top configuration row */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          {ratingMode === "rating" ? (
            <ShootingStarIcon className="h-5 w-5 shrink-0 text-amber-400" />
          ) : (
            <span className="inline-block h-4 w-4 shrink-0 rounded-full border-2 border-[#5C54D1]" />
          )}
          <select
            value={ratingMode}
            onChange={(e) => {
              const nextMode = e.target.value as RatingMode;
              onUpdateRatingType?.(nextMode);
              if (nextMode === "rating" && min !== 1) {
                onUpdateRange?.(1, Math.max(3, max));
              }
            }}
            className="rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 focus:border-[#5C54D1] focus:outline-none"
          >
            <option value="rating">{tbuilder("ratingMode.rating")}</option>
            <option value="linear">{tbuilder("ratingMode.linear")}</option>
          </select>
        </div>

        {ratingMode === "rating" ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {tbuilder("maxRating")}
            </span>
            <select
              value={max}
              onChange={(e) => onUpdateRange?.(1, Number(e.target.value))}
              className="rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 focus:border-[#5C54D1] focus:outline-none"
            >
              {[3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <select
              value={min}
              onChange={(e) => onUpdateRange?.(Number(e.target.value), max)}
              className="rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 focus:border-[#5C54D1] focus:outline-none"
            >
              {[0, 1].map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>

            <span className="text-sm text-gray-600">{tbuilder("to")}</span>

            <select
              value={max}
              onChange={(e) => onUpdateRange?.(min, Number(e.target.value))}
              className="rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 focus:border-[#5C54D1] focus:outline-none"
            >
              {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Linear mode: min & max label inputs (Google Forms style) */}
      {ratingMode === "linear" ? (
        <div className="flex flex-col gap-4 pt-1">
          <div className="flex items-center gap-4">
            <span className="w-5 text-sm text-gray-600">{min}</span>
            <input
              type="text"
              value={minLabel}
              onChange={(e) =>
                onUpdateLinearLabels?.(e.target.value, maxLabel)
              }
              placeholder={tbuilder("linearLabelPlaceholder")}
              className="w-full max-w-xs border-b border-gray-200 bg-transparent py-1 text-sm text-gray-800 transition-colors placeholder:text-gray-400 hover:border-gray-300 focus:border-b-2 focus:border-[#5C54D1] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-4">
            <span className="w-5 text-sm text-gray-600">{max}</span>
            <input
              type="text"
              value={maxLabel}
              onChange={(e) =>
                onUpdateLinearLabels?.(minLabel, e.target.value)
              }
              placeholder={tbuilder("linearLabelPlaceholder")}
              className="w-full max-w-xs border-b border-gray-200 bg-transparent py-1 text-sm text-gray-800 transition-colors placeholder:text-gray-400 hover:border-gray-300 focus:border-b-2 focus:border-[#5C54D1] focus:outline-none"
            />
          </div>
        </div>
      ) : (
        /* Rating mode: Star scale preview */
        <div className="grid grid-cols-5 gap-3 pt-2 sm:flex sm:flex-wrap sm:items-center sm:justify-around sm:gap-4">
          {levels.map((level) => (
            <div key={level} className="flex flex-col items-center gap-2">
              <span className="text-xs text-gray-600">{level}</span>
              <ShootingStarIcon className="h-5 w-5 text-gray-400 sm:h-6 sm:w-6" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
