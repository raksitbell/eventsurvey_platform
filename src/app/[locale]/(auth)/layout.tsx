"use client";

import AuthGuard from "@/components/auth/AuthGuard";
import { languages } from "@/i18n/languages";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { GlobeAltIcon } from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("auth");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  function cycleLocale() {
    const index = languages.findIndex((language) => language.id === locale);
    const next = languages[(index + 1) % languages.length] ?? languages[0];
    if (next.id !== locale) router.replace(pathname, { locale: next.id });
  }

  return (
    <AuthGuard area="guest">
      <div className="relative z-1 min-h-dvh bg-white dark:bg-gray-900">
        <div className="absolute end-4 top-4 z-50 sm:end-6 sm:top-6">
          <button
            type="button"
            onClick={cycleLocale}
            aria-label={t("language")}
            className="inline-flex h-8 items-center gap-1 rounded-[11px] px-2 text-base leading-6 text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/10"
          >
            <GlobeAltIcon className="size-[18px] shrink-0" aria-hidden="true" />
            <span className="w-[27px] text-center">{locale.toUpperCase()}</span>
          </button>
        </div>
        <div className="relative flex min-h-dvh w-full flex-col lg:flex-row lg:items-stretch">
          {children}
        </div>
      </div>
    </AuthGuard>
  );
}
