"use client";

import { useTranslations } from "next-intl";
import { CheckCircleIcon } from "@/icons";
import PreviewTopBar from "./PreviewTopBar";

interface PreviewSubmittedCardProps {
  title: string;
  onResetForm: () => void;
  onExitPreview: () => void;
}

export default function PreviewSubmittedCard({
  title,
  onResetForm,
  onExitPreview,
}: PreviewSubmittedCardProps) {
  const tPreview = useTranslations("form.preview");

  return (
    <div className="font-sans min-h-screen px-3 pt-4 pb-16 text-gray-800 sm:px-6 sm:pt-8">
      <div className="mx-auto max-w-2xl">
        <PreviewTopBar onExitPreview={onExitPreview} showBadge={false} />

        <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="absolute top-0 start-0 h-[10px] w-full bg-[#5C54D1]" />

          <div className="flex items-start gap-3 pt-2">
            <CheckCircleIcon className="mt-1 h-7 w-7 shrink-0 text-green-600" />
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl">
                {title}
              </h1>
              <p className="mt-3 text-sm text-gray-700">
                {tPreview("submittedDesc")}
              </p>

              <button
                type="button"
                onClick={onResetForm}
                className="mt-6 text-sm font-medium text-[#5C54D1] underline hover:text-indigo-800"
              >
                {tPreview("submitAnother")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

