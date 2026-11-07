"use client";

import { useTranslations } from "next-intl";
import {
  HandThumbUpIcon,
  HeartIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import {
  ICON,
  QuestionFieldProps,
  RATING_DISPLAY,
  RATING_DISPLAYS,
  RATING_ICONS,
} from "@/types/event/form";

function RatingIconGlyph({
  icon,
  highlighted = false,
  className = "h-5 w-5",
}: {
  icon: ICON;
  highlighted?: boolean;
  className?: string;
}) {
  if (icon === "heart") {
    return (
      <HeartIcon
        className={`${className} ${
          highlighted ? "fill-rose-500 text-rose-500" : "text-gray-400"
        }`}
      />
    );
  }
  if (icon === "like") {
    return (
      <HandThumbUpIcon
        className={`${className} ${
          highlighted ? "fill-[#5C54D1] text-[#5C54D1]" : "text-gray-400"
        }`}
      />
    );
  }
  return (
    <StarIcon
      className={`${className} ${
        highlighted ? "fill-amber-400 text-amber-400" : "text-gray-400"
      }`}
    />
  );
}

export default function Rating({
  question,
  locale = "th",
  onUpdateRange,
  onUpdateRatingDisplay,
  onUpdateRatingIcon,
  onUpdateLinearLabels,
}: QuestionFieldProps) {
  const tbuilder = useTranslations("form.builder");

  const ratingDisplay: RATING_DISPLAY = question.rating_display || "icon";
  const ratingIcon: ICON = question.rating_icon || "star";
  const ratingMax = Number(question.rating_max || question.max_number || 5);

  const min =
    question.min_number === 0 || question.min_number === 1
      ? question.min_number
      : 1;
  const max = question.max_number || ratingMax || 5;

  const currentLabel = question.label[locale]?.[0] ?? question.label.th[0];
  const scaleMinLabel =
    currentLabel?.scale_min_label ??
    currentLabel?.choices[locale]?.[0]?.scale_min_label ??
    "";
  const scaleMaxLabel =
    currentLabel?.scale_max_label ??
    currentLabel?.choices[locale]?.[0]?.scale_max_label ??
    "";

  const iconLevels = Array.from(
    { length: Math.max(1, ratingMax) },
    (_, idx) => idx + 1,
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Top configuration row */}
      <div className="flex flex-wrap items-center gap-4">
        {/* 1. Display Mode Select: icon vs linear_scale */}
        <div className="flex items-center gap-2">
          {ratingDisplay === "icon" ? (
            <RatingIconGlyph
              icon={ratingIcon}
              highlighted
              className="h-5 w-5 shrink-0"
            />
          ) : (
            <span className="inline-block h-4 w-4 shrink-0 rounded-full border-2 border-[#5C54D1]" />
          )}
          <select
            value={ratingDisplay}
            onChange={(e) => {
              const nextDisplay = e.target.value as RATING_DISPLAY;
              onUpdateRatingDisplay?.(nextDisplay);
              if (nextDisplay === "icon" && min !== 1) {
                onUpdateRange?.(1, Math.max(3, max));
              }
            }}
            className="rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 focus:border-[#5C54D1] focus:outline-none"
          >
            {RATING_DISPLAYS.map((mode) => (
              <option key={mode} value={mode}>
                {tbuilder(`ratingDisplay.${mode}`)}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Mode-specific options */}
        {ratingDisplay === "icon" ? (
          <>
            {/* Rating Icon Select: star | heart | like */}
            <div className="flex items-center gap-2">
              <select
                value={ratingIcon}
                onChange={(e) => onUpdateRatingIcon?.(e.target.value as ICON)}
                className="rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 focus:border-[#5C54D1] focus:outline-none"
              >
                {RATING_ICONS.map((ic) => (
                  <option key={ic} value={ic}>
                    {tbuilder(`ratingIcon.${ic}`)}
                  </option>
                ))}
              </select>
            </div>

            {/* Max Rating Select */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {tbuilder("maxRating")}
              </span>
              <select
                value={ratingMax}
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
          </>
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

      {/* Linear scale mode: scale_min_label & scale_max_label inputs */}
      {ratingDisplay === "linear_scale" ? (
        <div className="flex flex-col gap-4 pt-1">
          <div className="flex items-center gap-4">
            <span className="w-5 text-sm text-gray-600">{min}</span>
            <input
              type="text"
              value={scaleMinLabel}
              onChange={(e) =>
                onUpdateLinearLabels?.(e.target.value, scaleMaxLabel)
              }
              placeholder={tbuilder("linearLabelPlaceholder")}
              className="w-full max-w-xs border-b border-gray-200 bg-transparent py-1 text-sm text-gray-800 transition-colors placeholder:text-gray-400 hover:border-gray-300 focus:border-b-2 focus:border-[#5C54D1] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-4">
            <span className="w-5 text-sm text-gray-600">{max}</span>
            <input
              type="text"
              value={scaleMaxLabel}
              onChange={(e) =>
                onUpdateLinearLabels?.(scaleMinLabel, e.target.value)
              }
              placeholder={tbuilder("linearLabelPlaceholder")}
              className="w-full max-w-xs border-b border-gray-200 bg-transparent py-1 text-sm text-gray-800 transition-colors placeholder:text-gray-400 hover:border-gray-300 focus:border-b-2 focus:border-[#5C54D1] focus:outline-none"
            />
          </div>
        </div>
      ) : (
        /* Icon mode: preview with selected icon */
        <div className="grid grid-cols-5 gap-3 pt-2 sm:flex sm:flex-wrap sm:items-center sm:justify-around sm:gap-4">
          {iconLevels.map((level) => (
            <div key={level} className="flex flex-col items-center gap-2">
              <span className="text-xs text-gray-600">{level}</span>
              <RatingIconGlyph
                icon={ratingIcon}
                className="h-5 w-5 sm:h-6 sm:w-6"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
