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
        className="rounded-lg bg-(--participant-accent) px-6 py-2.5 text-sm font-medium text-(--form-on-accent) shadow-sm transition-colors hover:brightness-95"
      >
        {tPreview("submit")}
      </button>

      <button
        type="button"
        onClick={onClearForm}
        className="rounded-lg px-3 py-2 text-sm font-medium bg-(--form-background) text-(--form-link) transition-colors hover:underline"
      >
        {tPreview("clearForm")}
      </button>
    </div>
  );
}

