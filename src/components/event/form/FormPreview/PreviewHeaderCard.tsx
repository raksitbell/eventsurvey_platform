"use client";

import { useTranslations } from "next-intl";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";

interface PreviewHeaderCardProps {
  title: string;
  description?: string;
  opensAt?: string | null;
  closesAt?: string | null;
  hasRequiredQuestion: boolean;
}

export default function PreviewHeaderCard({
  title,
  description,
  opensAt,
  closesAt,
  hasRequiredQuestion,
}: PreviewHeaderCardProps) {
  const tPreview = useTranslations("form.preview");
  const hasSchedule = Boolean(opensAt || closesAt);

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

        {hasSchedule && (
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
            {opensAt && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDaysIcon className="h-4 w-4 text-gray-400" />
                <span>
                  {tPreview("opensAt")}: {opensAt}
                </span>
              </span>
            )}
            {closesAt && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDaysIcon className="h-4 w-4 text-gray-400" />
                <span>
                  {tPreview("closesAt")}: {closesAt}
                </span>
              </span>
            )}
          </div>
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
