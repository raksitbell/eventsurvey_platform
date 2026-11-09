"use client";

import { useTranslations } from "next-intl";

interface PreviewFooterActionsProps {
  onClearForm: () => void;
}

export default function PreviewFooterActions({
  onClearForm,
}: PreviewFooterActionsProps) {
  const tPreview = useTranslations("form.preview");

  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
      <button
        type="submit"
        className="rounded-lg bg-[#5C54D1] px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#4b43b8]"
      >
        {tPreview("submit")}
      </button>

      <button
        type="button"
        onClick={onClearForm}
        className="rounded-lg px-3 py-2 text-sm font-medium text-[#5C54D1] transition-colors hover:bg-indigo-50"
      >
        {tPreview("clearForm")}
      </button>
    </div>
  );
}

