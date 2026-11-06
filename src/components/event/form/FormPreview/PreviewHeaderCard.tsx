"use client";

import { useTranslations } from "next-intl";

interface PreviewHeaderCardProps {
  title: string;
  description?: string;
  hasRequiredQuestion: boolean;
}

export default function PreviewHeaderCard({
  title,
  description,
  hasRequiredQuestion,
}: PreviewHeaderCardProps) {
  const tPreview = useTranslations("form.preview");

  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="absolute top-0 start-0 h-[10px] w-full bg-[#5C54D1]" />

      <div className="px-5 pt-8 pb-5 sm:px-7 sm:pt-9">
        <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-sm whitespace-pre-wrap text-gray-600">
            {description}
          </p>
        )}

        {hasRequiredQuestion && (
          <div className="mt-4 border-t border-gray-200 pt-3 text-xs font-medium text-red-600">
            {tPreview("requiredNote")}
          </div>
        )}
      </div>
    </div>
  );
}

