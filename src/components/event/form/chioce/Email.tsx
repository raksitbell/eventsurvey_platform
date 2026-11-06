"use client";

import { useTranslations } from "next-intl";
import { MailIcon } from "@/icons";

export default function Email() {
  const tbuilder = useTranslations("form.builder");

  return (
    <div className="flex w-full max-w-md items-center justify-between border-b border-gray-300 pb-2 text-sm text-gray-400">
      <span>{tbuilder("emailPlaceholder")}</span>
      <MailIcon className="h-5 w-5 shrink-0 text-gray-400" />
    </div>
  );
}
