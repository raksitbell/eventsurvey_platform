import { ShootingStarIcon } from "@/icons";
import { QuestionFieldProps } from "@/types/event/form";

export default function Rating({
  question,
  onUpdateRange,
}: QuestionFieldProps) {
  const max = question.max_number || 5;
  const levels = Array.from({ length: max }, (_, idx) => idx + 1);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">Max rating:</span>
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

      <div className="flex flex-wrap items-center justify-around gap-4 pt-2">
        {levels.map((level) => (
          <div key={level} className="flex flex-col items-center gap-2">
            <span className="text-xs text-gray-600">{level}</span>
            <ShootingStarIcon className="h-6 w-6 text-gray-400" />
          </div>
        ))}
      </div>
    </div>
  );
}

