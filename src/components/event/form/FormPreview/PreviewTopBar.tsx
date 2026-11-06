"use client";

import { useTranslations } from "next-intl";
import { PencilIcon } from "@/icons";

interface PreviewTopBarProps {
  onExitPreview: () => void;
  showBadge?: boolean;
}

export default function PreviewTopBar({
  onExitPreview,
  showBadge = true,
}: PreviewTopBarProps) {
  const tPreview = useTranslations("form.preview");

  return (
    <div
      className={`mb-4 flex items-center gap-3 ${
        showBadge ? "justify-between" : "justify-end"
      }`}
    >
      {showBadge && (
        <span className="rounded-full px-3 py-1 text-xs font-semibold text-[#5C54D1]">
          {tPreview("button")}
        </span>
      )}
      <button
        type="button"
        onClick={onExitPreview}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
      >
        <PencilIcon className="h-4 w-4" />
        <span>{tPreview("editForm")}</span>
      </button>
    </div>
  );
}

